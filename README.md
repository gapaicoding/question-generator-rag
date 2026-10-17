# PDF Question Generator Experiment

Local FastAPI experiment that extracts text from a PDF, embeds page-aware chunks with Ollama, stores them in persistent ChromaDB, and generates grounded multiple-choice questions with Qwen. No cloud AI account is needed.

## Requirements

- Python 3.11 or newer
- Ollama running locally

## Setup on Windows

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
Copy-Item .env.example .env
ollama pull nomic-embed-text
ollama pull qwen3:4b
ollama serve
```

If Ollama already runs in the background, skip `ollama serve`. For a smaller CPU model, set `OLLAMA_LLM_MODEL=qwen3:1.7b` in `.env` and pull that model.

In another terminal, activate the same environment and run:

```powershell
uvicorn backend.main:app --reload
```

Open [Swagger UI](http://localhost:8000/docs). Upload a text-based PDF through `POST /documents`, then use its `document_id` in `POST /search` and `POST /generate`. Scanned image PDFs need OCR and are rejected in this version.

Example generation request:

```json
{"document_id":"returned-uuid","topic":"sistem pernapasan","question_count":5,"difficulty":"medium","type":"multiple_choice"}
```

Run tests with `pytest -q`. The tests use a temporary Chroma store and a fake generator; they do not require Ollama. For a live acceptance check, upload a real PDF in Swagger, search a topic, generate five questions, and verify the returned page references against the PDF. Uploaded files and persistent vectors are kept in `uploads/` and `chroma_data/` and ignored by Git.
