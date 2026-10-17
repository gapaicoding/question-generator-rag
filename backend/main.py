import logging
import re
import time
from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, File, HTTPException, UploadFile

from backend.chunker import chunk_pages
from backend.config import settings
from backend.generator import InvalidGeneration, generate_questions
from backend.ollama_client import OllamaClient, OllamaError
from backend.pdf_parser import InvalidPDF, extract_pages
from backend.schemas import DocumentResponse, GenerateRequest, GenerateResponse, SearchRequest, SearchResponse
from backend.vector_store import VectorStore

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
app = FastAPI(title="PDF Question Generator", version="0.1")


def store() -> VectorStore:
    return VectorStore()


def ollama() -> OllamaClient:
    return OllamaClient()


def require_document(db: VectorStore, document_id: str) -> None:
    if not db.exists(document_id):
        raise HTTPException(status_code=404, detail="Document not found.")


def requested_section(prompt: str) -> str | None:
    match = re.search(r"\b(lesson|unit|bab|chapter|pelajaran)\s+(\d+|[ivxlcdm]+)\b", prompt, re.IGNORECASE)
    if not match:
        return None
    number = match.group(2)
    normalized = str(int(number)) if number.isdigit() else number.upper()
    return f"{match.group(1).title()} {normalized}"


@app.get("/health")
def health():
    return {"status": "ok", "ollama": ollama().available()}


@app.post("/documents", response_model=DocumentResponse)
def upload_document(file: UploadFile = File(...)):
    filename = Path(file.filename or "").name
    if not filename.lower().endswith(".pdf") or file.content_type not in ("application/pdf", "application/x-pdf"):
        raise HTTPException(status_code=415, detail="Only PDF files are accepted.")
    data = file.file.read(settings.max_pdf_bytes + 1)
    if len(data) > settings.max_pdf_bytes:
        raise HTTPException(status_code=413, detail="PDF exceeds the 25 MB limit.")
    if not data.startswith(b"%PDF-"):
        raise HTTPException(status_code=400, detail="PDF is corrupted or invalid.")
    logger.info("PDF uploaded: %s", filename)
    try:
        pages = extract_pages(data)
    except InvalidPDF as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    logger.info("PDF parsed; pages=%d", len(pages))
    document_id = str(uuid4())
    chunks = chunk_pages(pages, document_id, filename, settings.chunk_size, settings.chunk_overlap)
    sections = list(dict.fromkeys(chunk["section"] for chunk in chunks if chunk.get("section")))
    logger.info("Number of chunks: %d; embedding started", len(chunks))
    db = None
    document_path = settings.upload_path / f"{document_id}.pdf"
    try:
        client = ollama()
        vectors = []
        for start in range(0, len(chunks), 16):
            vectors.extend(client.embed([c["content"] for c in chunks[start:start + 16]]))
        logger.info("Embedding completed")
        db = store()
        db.add(chunks, vectors)
        logger.info("Chroma insert completed")
        settings.upload_path.mkdir(parents=True, exist_ok=True)
        document_path.write_bytes(data)
    except OllamaError as exc:
        try:
            if db:
                db.delete(document_id)
        except Exception:
            logger.exception("Index cleanup failed after Ollama error")
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception:
        logger.exception("Indexing failed")
        try:
            if db:
                db.delete(document_id)
        except Exception:
            logger.exception("Index cleanup failed")
        try:
            document_path.unlink(missing_ok=True)
        except OSError:
            logger.exception("Uploaded PDF cleanup failed")
        raise HTTPException(status_code=500, detail="Document indexing failed.")
    return DocumentResponse(document_id=document_id, filename=filename, pages=len(pages), chunks=len(chunks), sections=sections)


@app.post("/search", response_model=SearchResponse)
def search(request: SearchRequest):
    try:
        db = store()
        require_document(db, request.document_id)
        logger.info("Retrieval query; document=%s", request.document_id)
        vector = ollama().embed([request.query])[0]
        results = db.search(request.document_id, vector, request.top_k)
    except OllamaError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Document search failed")
        raise HTTPException(status_code=500, detail="Document search failed.") from exc
    logger.info("Retrieved chunk count: %d", len(results))
    return SearchResponse(query=request.query, results=results)


@app.post("/generate", response_model=GenerateResponse)
def generate(request: GenerateRequest):
    request_started = time.perf_counter()
    try:
        db = store()
        require_document(db, request.document_id)
        requested_scope = request.scope or requested_section(request.topic)
        scope = None
        if requested_scope:
            indexed_sections = db.list_sections(request.document_id)
            if indexed_sections:
                scope = next((section for section in indexed_sections if section.casefold() == requested_scope.casefold()), None)
                if not scope:
                    raise HTTPException(status_code=422, detail="Requested section was not found in the indexed document. Re-upload the PDF to refresh section indexing.")
            else:
                logger.info("No document sections detected; falling back to full-document semantic retrieval")
        embedding_started = time.perf_counter()
        logger.info("Query embedding started")
        retrieval_query = f"{scope or ''} {request.topic}".strip()
        vector = ollama().embed([retrieval_query])[0]
        logger.info("Query embedding completed in %.2f seconds", time.perf_counter() - embedding_started)
        retrieval_started = time.perf_counter()
        if scope:
            chunks = db.search(request.document_id, vector, settings.top_k, section=scope)
        else:
            chunks = db.search(request.document_id, vector, settings.top_k)
        logger.info("Retrieval completed in %.2f seconds", time.perf_counter() - retrieval_started)
        logger.info("Retrieved chunk count: %d", len(chunks))
        if scope and not chunks:
            raise HTTPException(status_code=422, detail="Requested section has no searchable content in the indexed document.")
        max_distance = getattr(settings, "max_retrieval_distance", 1.2)
        filtered_chunks = [chunk for chunk in chunks if chunk.get("distance", 0) <= max_distance]
        minimum_chars = min(320, 32 * request.question_count)
        context_chars = sum(len(chunk["content"]) for chunk in filtered_chunks)
        if not scope and context_chars < minimum_chars:
            logger.info("Relevant context too thin for whole-document scope; widening retrieval")
            chunks = db.search(request.document_id, vector, settings.top_k * 4)
            filtered_chunks = chunks
            context_chars = sum(len(chunk["content"]) for chunk in filtered_chunks)
        chunks = filtered_chunks
        if not chunks:
            raise HTTPException(status_code=422, detail="No relevant source material found for this topic.")
        if context_chars < minimum_chars:
            raise HTTPException(status_code=422, detail="Retrieved source material is too short to create the requested number of grounded questions.")
        generation_started = time.perf_counter()
        logger.info("LLM generation started")
        questions = generate_questions(ollama(), request.topic, request.difficulty, request.question_count, chunks, scope)
        logger.info("LLM generation completed in %.2f seconds", time.perf_counter() - generation_started)
    except OllamaError as exc:
        logger.warning("Generate request failed after %.2f seconds: %s", time.perf_counter() - request_started, exc)
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except InvalidGeneration as exc:
        logger.warning("Parsing error: %s", exc)
        raise HTTPException(status_code=502, detail="LLM returned invalid structured output.") from exc
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Question generation failed after %.2f seconds", time.perf_counter() - request_started)
        raise HTTPException(status_code=500, detail="Question generation failed.") from exc
    logger.info("Generate request completed in %.2f seconds", time.perf_counter() - request_started)
    return GenerateResponse(document_id=request.document_id, topic=request.topic, difficulty=request.difficulty, questions=questions)


@app.delete("/documents/{document_id}")
def delete_document(document_id: str):
    try:
        db = store()
        require_document(db, document_id)
        db.delete(document_id)
        (settings.upload_path / f"{document_id}.pdf").unlink(missing_ok=True)
    except Exception as exc:
        if isinstance(exc, HTTPException):
            raise
        logger.exception("Document deletion failed; document=%s", document_id)
        raise HTTPException(status_code=500, detail="Document deletion failed.") from exc
    return {"document_id": document_id, "status": "deleted"}
