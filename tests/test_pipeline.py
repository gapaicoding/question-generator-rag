from types import SimpleNamespace

import pymupdf
from fastapi.testclient import TestClient

from backend.chunker import chunk_pages
from backend.generator import InvalidGeneration, generate_questions
from backend.main import app
import backend.main as main
from backend.ollama_client import OllamaError
from backend.pdf_parser import InvalidPDF, extract_pages
from backend.vector_store import VectorStore


def test_pdf_parser():
    doc = pymupdf.open()
    page = doc.new_page()
    page.insert_text((72, 72), "Respiration uses lungs.")
    pages = extract_pages(doc.tobytes())
    assert pages == [{"page": 1, "text": "Respiration uses lungs."}]
    empty = pymupdf.open()
    empty.new_page()
    try:
        extract_pages(empty.tobytes())
        assert False
    except InvalidPDF:
        pass


def test_chunker_metadata_and_overlap():
    chunks = chunk_pages([{"page": 3, "text": "alpha beta gamma delta epsilon zeta eta theta"}], "doc", "x.pdf", 22, 6)
    assert len(chunks) > 1
    assert all(c["page"] == 3 and c["document_id"] == "doc" for c in chunks)
    assert chunks[0]["chunk_index"] == 0
    assert "gamma" in chunks[0]["content"] and "gamma" in chunks[1]["content"]


def test_vector_store_persistence_filter_delete(tmp_path):
    db = VectorStore(tmp_path)
    chunks = [{"document_id": doc, "filename": "x.pdf", "page": 1, "chunk_index": 0, "content": doc} for doc in ("a", "b")]
    db.add(chunks, [[1.0, 0.0], [0.0, 1.0]])
    reopened = VectorStore(tmp_path)
    assert reopened.search("a", [0.0, 1.0], 5)[0]["content"] == "a"
    reopened.delete("a")
    assert not db.exists("a") and db.exists("b")


def test_api_basic():
    client = TestClient(app)
    assert client.get("/health").status_code == 200
    assert client.post("/documents", files={"file": ("bad.pdf", b"bad", "application/pdf")}).status_code == 400
    assert client.post("/generate", json={"document_id": "missing", "topic": "lungs"}).status_code == 404


def test_generation_attaches_retrieved_source():
    class FakeClient:
        def generate(self, prompt):
            return '{"questions":[{"question":"Q?","options":["a","b","c","d"],"answer":"a","explanation":"Because.","source_ids":[1]}]}'

    result = generate_questions(FakeClient(), "topic", "easy", 1, [{"content": "Fact", "page": 4, "chunk_index": 2}])
    assert result[0].sources[0].page == 4


class MemoryStore:
    def __init__(self):
        self.documents = {}

    def add(self, chunks, embeddings):
        self.documents[chunks[0]["document_id"]] = chunks

    def exists(self, document_id):
        return document_id in self.documents

    def search(self, document_id, embedding, top_k):
        return [
            {"content": chunk["content"], "page": chunk["page"], "chunk_index": chunk["chunk_index"], "distance": 0.1}
            for chunk in self.documents.get(document_id, [])[:top_k]
        ]

    def delete(self, document_id):
        self.documents.pop(document_id, None)


class FakeOllama:
    def embed(self, texts):
        return [[0.1, 0.2] for _ in texts]

    def generate(self, prompt):
        return '{"questions":[{"question":"Apa fungsi respirasi?","options":["Pertukaran gas","Pencernaan","Gerak","Pendengaran"],"answer":"Pertukaran gas","explanation":"Materi menyebut respirasi sebagai pertukaran gas.","source_ids":[1]}]}'


def make_pdf(text="Respiration is the process of gas exchange."):
    document = pymupdf.open()
    page = document.new_page()
    page.insert_text((72, 72), text)
    return document.tobytes()


def patch_api(monkeypatch, tmp_path):
    memory_store = MemoryStore()
    monkeypatch.setattr(main, "store", lambda: memory_store)
    monkeypatch.setattr(main, "ollama", FakeOllama)
    monkeypatch.setattr(
        main,
        "settings",
        SimpleNamespace(
            max_pdf_bytes=25 * 1024 * 1024,
            chunk_size=1200,
            chunk_overlap=200,
            top_k=5,
            upload_path=tmp_path,
        ),
    )
    return memory_store


def test_api_document_flow_upload_search_generate_delete(monkeypatch, tmp_path):
    memory_store = patch_api(monkeypatch, tmp_path)
    client = TestClient(app)

    upload = client.post(
        "/documents",
        files={"file": ("respiration.pdf", make_pdf(), "application/pdf")},
    )
    assert upload.status_code == 200
    document = upload.json()
    document_id = document["document_id"]
    assert document["pages"] == 1
    assert document["chunks"] == 1
    assert (tmp_path / f"{document_id}.pdf").exists()

    search = client.post("/search", json={"document_id": document_id, "query": "gas exchange"})
    assert search.status_code == 200
    assert search.json()["results"][0]["page"] == 1

    generated = client.post(
        "/generate",
        json={"document_id": document_id, "topic": "respiration", "question_count": 1, "difficulty": "easy"},
    )
    assert generated.status_code == 200
    question = generated.json()["questions"][0]
    assert len(question["options"]) == 4
    assert question["answer"] in question["options"]
    assert question["sources"] == [{"page": 1, "chunk_index": 0}]

    deleted = client.delete(f"/documents/{document_id}")
    assert deleted.status_code == 200
    assert not (tmp_path / f"{document_id}.pdf").exists()
    assert not memory_store.exists(document_id)
    assert client.post("/search", json={"document_id": document_id, "query": "gas exchange"}).status_code == 404


def test_api_reports_ollama_and_scanned_pdf_errors(monkeypatch, tmp_path):
    patch_api(monkeypatch, tmp_path)
    client = TestClient(app)

    scanned = pymupdf.open()
    scanned.new_page()
    response = client.post(
        "/documents",
        files={"file": ("scan.pdf", scanned.tobytes(), "application/pdf")},
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "PDF contains no extractable text."

    class UnavailableOllama:
        def embed(self, texts):
            raise OllamaError("Ollama service is unavailable.")

    monkeypatch.setattr(main, "ollama", UnavailableOllama)
    response = client.post(
        "/documents",
        files={"file": ("respiration.pdf", make_pdf(), "application/pdf")},
    )
    assert response.status_code == 503
    assert response.json()["detail"] == "Ollama service is unavailable."


def test_generation_rejects_invalid_model_output_after_retry():
    class InvalidClient:
        def generate(self, prompt):
            return '{"questions":[{"question":"Q?","options":["a","b","c","d"],"answer":"missing","explanation":"Because.","source_ids":[1]}]}'

    chunks = [{"content": "Fact", "page": 4, "chunk_index": 2}]
    try:
        generate_questions(InvalidClient(), "topic", "easy", 1, chunks)
        assert False, "Expected invalid generation output to be rejected."
    except InvalidGeneration:
        pass
