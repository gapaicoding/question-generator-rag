from types import SimpleNamespace

import pymupdf
import pytest
import requests
from fastapi.testclient import TestClient

from backend.chunker import chunk_pages
from backend.generator import InvalidGeneration, _generation_schema, generate_questions
from backend.main import app
import backend.main as main
from backend.ollama_client import OllamaClient, OllamaError
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


def test_chunker_detects_and_carries_document_sections():
    pages = [
        {"page": 3, "text": "LESSON 1 Let Me Introduce Myself\nHello, my name is Rina."},
        {"page": 4, "text": "I am seven years old and I am from Jakarta."},
        {"page": 5, "text": "LESSON 2 My Pets\nI have a cat."},
    ]

    chunks = chunk_pages(pages, "doc", "lesson.pdf", 1200, 200)

    assert [chunk["section"] for chunk in chunks] == ["Lesson 1", "Lesson 1", "Lesson 2"]


def test_vector_store_persistence_filter_delete(tmp_path):
    db = VectorStore(tmp_path)
    chunks = [{"document_id": doc, "filename": "x.pdf", "page": 1, "chunk_index": 0, "content": doc} for doc in ("a", "b")]
    db.add(chunks, [[1.0, 0.0], [0.0, 1.0]])
    reopened = VectorStore(tmp_path)
    assert reopened.search("a", [0.0, 1.0], 5)[0]["content"] == "a"
    reopened.delete("a")
    assert not db.exists("a") and db.exists("b")


def test_vector_store_search_filters_by_section(tmp_path):
    db = VectorStore(tmp_path)
    chunks = [
        {"document_id": "doc", "filename": "book.pdf", "page": 1, "chunk_index": 0, "section": "Lesson 1", "content": "Greetings and names"},
        {"document_id": "doc", "filename": "book.pdf", "page": 2, "chunk_index": 0, "section": "Lesson 2", "content": "Numbers and counting"},
    ]
    db.add(chunks, [[1.0, 0.0], [0.0, 1.0]])

    results = db.search("doc", [0.0, 1.0], 5, section="Lesson 1")

    assert len(results) == 1
    assert results[0]["section"] == "Lesson 1"
    assert results[0]["content"] == "Greetings and names"


def test_api_basic():
    client = TestClient(app)
    assert client.get("/health").status_code == 200
    assert client.post("/documents", files={"file": ("bad.pdf", b"bad", "application/pdf")}).status_code == 400
    assert client.post("/generate", json={"document_id": "missing", "topic": "lungs"}).status_code == 404


def test_generation_attaches_retrieved_source():
    class FakeClient:
        def generate(self, prompt, response_schema=None):
            assert response_schema == _generation_schema(1)
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

    def list_sections(self, document_id):
        return list(dict.fromkeys(
            chunk.get("section", "")
            for chunk in self.documents.get(document_id, [])
            if chunk.get("section")
        ))

    def search(self, document_id, embedding, top_k, section=None):
        return [
            {"content": chunk["content"], "page": chunk["page"], "chunk_index": chunk["chunk_index"], "section": chunk.get("section", ""), "distance": chunk.get("distance", 0.1)}
            for chunk in self.documents.get(document_id, [])
            if section is None or chunk.get("section") == section
        ]

    def delete(self, document_id):
        self.documents.pop(document_id, None)


class FakeOllama:
    def embed(self, texts):
        return [[0.1, 0.2] for _ in texts]

    def generate(self, prompt, response_schema=None):
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
            max_retrieval_distance=1.2,
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


def test_ollama_timeout_is_reported_as_controlled_error(monkeypatch):
    def timeout(*args, **kwargs):
        raise requests.Timeout("injected timeout")

    monkeypatch.setattr("backend.ollama_client.requests.post", timeout)

    with pytest.raises(OllamaError, match="timed out"):
        OllamaClient().embed(["test text"])


def test_ollama_generation_sends_structured_output_schema(monkeypatch):
    captured = {}

    class Response:
        status_code = 200
        ok = True

        def json(self):
            return {"response": "{}"}

    def post(url, json, timeout):
        captured.update(json)
        return Response()

    monkeypatch.setattr("backend.ollama_client.requests.post", post)
    schema = _generation_schema(3)

    result = OllamaClient().generate("make questions", response_schema=schema)

    assert result == "{}"
    assert captured["format"] == schema


def test_upload_handles_vector_store_failure_and_cleans_up(monkeypatch, tmp_path):
    class BrokenInsertStore(MemoryStore):
        def add(self, chunks, embeddings):
            self.documents[chunks[0]["document_id"]] = chunks
            raise RuntimeError("injected Chroma insert failure")

    broken_store = BrokenInsertStore()
    monkeypatch.setattr(main, "store", lambda: broken_store)
    monkeypatch.setattr(main, "ollama", FakeOllama)
    monkeypatch.setattr(
        main,
        "settings",
        SimpleNamespace(max_pdf_bytes=25 * 1024 * 1024, chunk_size=1200, chunk_overlap=200, top_k=5, max_retrieval_distance=1.2, upload_path=tmp_path),
    )
    client = TestClient(app, raise_server_exceptions=False)

    response = client.post("/documents", files={"file": ("failure.pdf", make_pdf(), "application/pdf")})

    assert response.status_code == 500
    assert response.json()["detail"] == "Document indexing failed."
    assert broken_store.documents == {}
    assert list(tmp_path.glob("*.pdf")) == []


@pytest.mark.parametrize("endpoint", ["/search", "/generate"])
def test_retrieval_store_failure_returns_controlled_error(monkeypatch, tmp_path, endpoint):
    class BrokenSearchStore(MemoryStore):
        def search(self, document_id, embedding, top_k, section=None):
            raise RuntimeError("injected Chroma query failure")

    broken_store = BrokenSearchStore()
    broken_store.documents["doc"] = [{"content": "A sufficiently long piece of source material for the failure path.", "page": 1, "chunk_index": 0}]
    monkeypatch.setattr(main, "store", lambda: broken_store)
    monkeypatch.setattr(main, "ollama", FakeOllama)
    patch_api(monkeypatch, tmp_path)
    monkeypatch.setattr(main, "store", lambda: broken_store)
    client = TestClient(app, raise_server_exceptions=False)
    if endpoint == "/search":
        response = client.post(endpoint, json={"document_id": "doc", "query": "source"})
        expected = "Document search failed."
    else:
        response = client.post(endpoint, json={"document_id": "doc", "topic": "source", "question_count": 1})
        expected = "Question generation failed."

    assert response.status_code == 500
    assert response.json() == {"detail": expected}


def test_generation_ollama_failure_returns_service_unavailable(monkeypatch, tmp_path):
    memory_store = patch_api(monkeypatch, tmp_path)
    memory_store.documents["doc"] = [
        {"content": "A sufficiently long passage about respiration and gas exchange.", "page": 1, "chunk_index": 0},
    ]

    class BrokenGeneratorOllama(FakeOllama):
        def generate(self, prompt, response_schema=None):
            raise OllamaError("Ollama request timed out.")

    monkeypatch.setattr(main, "ollama", BrokenGeneratorOllama)
    response = TestClient(app).post(
        "/generate",
        json={"document_id": "doc", "topic": "respiration", "question_count": 1},
    )

    assert response.status_code == 503
    assert response.json()["detail"] == "Ollama request timed out."


def test_delete_store_failure_returns_controlled_error(monkeypatch, tmp_path):
    class BrokenDeleteStore(MemoryStore):
        def delete(self, document_id):
            raise RuntimeError("injected Chroma delete failure")

    broken_store = BrokenDeleteStore()
    broken_store.documents["doc"] = [{"content": "indexed", "page": 1, "chunk_index": 0}]
    monkeypatch.setattr(main, "store", lambda: broken_store)
    monkeypatch.setattr(main, "settings", SimpleNamespace(upload_path=tmp_path))

    response = TestClient(app, raise_server_exceptions=False).delete("/documents/doc")

    assert response.status_code == 500
    assert response.json() == {"detail": "Document deletion failed."}


def test_requested_section_detection():
    assert main.requested_section("Buat soal dari Lesson 01 tentang greeting") == "Lesson 1"
    assert main.requested_section("Fokus pada BAB II") == "Bab II"
    assert main.requested_section("sistem pernapasan") is None


def test_generate_scopes_retrieval_and_rejects_missing_or_weak_context(monkeypatch, tmp_path):
    memory_store = patch_api(monkeypatch, tmp_path)
    document_id = "scoped-doc"
    memory_store.documents[document_id] = [
        {"content": "Greeting: Hello. A person introduces their name by saying My name is Rina.", "page": 3, "chunk_index": 0, "section": "Lesson 1"},
        {"content": "LESSON 2 is about numbers and counting from one to ten.", "page": 14, "chunk_index": 0, "section": "Lesson 2"},
    ]
    client = TestClient(app)

    scoped = client.post(
        "/generate",
        json={"document_id": document_id, "topic": "buat soal tentang greeting", "scope": "Lesson 1", "question_count": 1},
    )
    assert scoped.status_code == 200
    assert scoped.json()["questions"][0]["sources"][0]["page"] == 3

    missing = client.post(
        "/generate",
        json={"document_id": document_id, "topic": "numbers", "scope": "Lesson 3", "question_count": 1},
    )
    assert missing.status_code == 422
    assert "Requested section was not found" in missing.json()["detail"]

    memory_store.documents[document_id] = [
        {"content": "An unrelated but long passage about geology and rock formation that does not answer the request.", "page": 20, "chunk_index": 0, "section": "Lesson 1", "distance": 1.8},
    ]
    weak = client.post(
        "/generate",
        json={"document_id": document_id, "topic": "buat soal tentang greeting", "scope": "Lesson 1", "question_count": 1},
    )
    assert weak.status_code == 422
    assert weak.json()["detail"] == "No relevant source material found for this topic."


def test_generate_rejects_context_too_short(monkeypatch, tmp_path):
    memory_store = patch_api(monkeypatch, tmp_path)
    document_id = "short-context-doc"
    memory_store.documents[document_id] = [
        {"content": "Lesson 1: Hello.", "page": 1, "chunk_index": 0, "section": "Lesson 1"},
    ]

    response = TestClient(app).post(
        "/generate",
        json={"document_id": document_id, "topic": "greeting", "scope": "Lesson 1", "question_count": 1},
    )

    assert response.status_code == 422
    assert "too short" in response.json()["detail"]


def test_generate_falls_back_to_full_document_when_no_sections_exist(monkeypatch, tmp_path):
    memory_store = patch_api(monkeypatch, tmp_path)
    document_id = "unstructured-doc"
    memory_store.documents[document_id] = [
        {"content": "Hello is a greeting. To introduce a name, say My name is Rina. Ask age with How old are you.", "page": 2, "chunk_index": 0},
    ]

    response = TestClient(app).post(
        "/generate",
        json={"document_id": document_id, "topic": "Lesson 1: greeting and introducing a name", "question_count": 1},
    )

    assert response.status_code == 200
    assert response.json()["questions"][0]["sources"][0]["page"] == 2


def test_generation_rejects_invalid_model_output_after_retry():
    class InvalidClient:
        def generate(self, prompt, response_schema=None):
            return '{"questions":[{"question":"Q?","options":["a","b","c","d"],"answer":"missing","explanation":"Because.","source_ids":[1]}]}'

    chunks = [{"content": "Fact", "page": 4, "chunk_index": 2}]
    try:
        generate_questions(InvalidClient(), "topic", "easy", 1, chunks)
        assert False, "Expected invalid generation output to be rejected."
    except InvalidGeneration:
        pass


def test_malformed_generation_diagnostics_do_not_log_model_content(caplog):
    private_text = "private-material-fragment"

    class MalformedClient:
        def generate(self, prompt, response_schema=None):
            return private_text

    chunks = [{"content": "Some sufficiently long source content.", "page": 1, "chunk_index": 0}]

    with pytest.raises(InvalidGeneration, match="did not contain a JSON object") as error:
        generate_questions(MalformedClient(), "topic", "easy", 1, chunks)

    assert private_text not in str(error.value)
    assert private_text not in caplog.text


def test_validation_diagnostics_do_not_log_invalid_field_content(caplog):
    private_text = "private-answer-fragment"

    class WrongTypesClient:
        def generate(self, prompt, response_schema=None):
            return (
                '{"questions":[{"question":"Q?","options":"' + private_text
                + '","answer":"a","explanation":"Because.","source_ids":[1]}]}'
            )

    chunks = [{"content": "Some sufficiently long source content.", "page": 1, "chunk_index": 0}]

    with pytest.raises(InvalidGeneration) as error:
        generate_questions(WrongTypesClient(), "topic", "easy", 1, chunks)

    assert private_text not in str(error.value)
    assert private_text not in caplog.text
