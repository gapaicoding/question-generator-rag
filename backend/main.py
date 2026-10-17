import logging
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
    logger.info("Number of chunks: %d; embedding started", len(chunks))
    try:
        client = ollama()
        vectors = []
        for start in range(0, len(chunks), 16):
            vectors.extend(client.embed([c["content"] for c in chunks[start:start + 16]]))
        logger.info("Embedding completed")
        db = store()
        db.add(chunks, vectors)
        logger.info("Chroma insert completed")
    except OllamaError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception:
        logger.exception("Indexing failed")
        try:
            store().delete(document_id)
        except Exception:
            logger.exception("Index cleanup failed")
        raise HTTPException(status_code=500, detail="Document indexing failed.")
    settings.upload_path.mkdir(parents=True, exist_ok=True)
    (settings.upload_path / f"{document_id}.pdf").write_bytes(data)
    return DocumentResponse(document_id=document_id, filename=filename, pages=len(pages), chunks=len(chunks))


@app.post("/search", response_model=SearchResponse)
def search(request: SearchRequest):
    db = store()
    require_document(db, request.document_id)
    logger.info("Retrieval query; document=%s", request.document_id)
    try:
        vector = ollama().embed([request.query])[0]
    except OllamaError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    results = db.search(request.document_id, vector, request.top_k)
    logger.info("Retrieved chunk count: %d", len(results))
    return SearchResponse(query=request.query, results=results)


@app.post("/generate", response_model=GenerateResponse)
def generate(request: GenerateRequest):
    request_started = time.perf_counter()
    db = store()
    require_document(db, request.document_id)
    try:
        embedding_started = time.perf_counter()
        logger.info("Query embedding started")
        vector = ollama().embed([request.topic])[0]
        logger.info("Query embedding completed in %.2f seconds", time.perf_counter() - embedding_started)
        retrieval_started = time.perf_counter()
        chunks = db.search(request.document_id, vector, settings.top_k)
        logger.info("Retrieval completed in %.2f seconds", time.perf_counter() - retrieval_started)
        logger.info("Retrieved chunk count: %d", len(chunks))
        if not chunks:
            raise HTTPException(status_code=422, detail="No relevant source material found for this topic.")
        generation_started = time.perf_counter()
        logger.info("LLM generation started")
        questions = generate_questions(ollama(), request.topic, request.difficulty, request.question_count, chunks)
        logger.info("LLM generation completed in %.2f seconds", time.perf_counter() - generation_started)
    except OllamaError as exc:
        logger.warning("Generate request failed after %.2f seconds: %s", time.perf_counter() - request_started, exc)
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except InvalidGeneration as exc:
        logger.warning("Parsing error: %s", exc)
        raise HTTPException(status_code=502, detail="LLM returned invalid structured output.") from exc
    logger.info("Generate request completed in %.2f seconds", time.perf_counter() - request_started)
    return GenerateResponse(document_id=request.document_id, topic=request.topic, difficulty=request.difficulty, questions=questions)


@app.delete("/documents/{document_id}")
def delete_document(document_id: str):
    db = store()
    require_document(db, document_id)
    db.delete(document_id)
    (settings.upload_path / f"{document_id}.pdf").unlink(missing_ok=True)
    return {"document_id": document_id, "status": "deleted"}
