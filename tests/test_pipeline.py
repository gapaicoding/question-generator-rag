import pymupdf
from fastapi.testclient import TestClient

from backend.chunker import chunk_pages
from backend.generator import generate_questions
from backend.main import app
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
