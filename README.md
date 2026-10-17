# PDF Question Generator Experiment

Local FastAPI experiment that extracts text from a PDF, embeds page-aware chunks with Ollama, stores them in persistent ChromaDB, and generates grounded multiple-choice questions with Qwen. No cloud AI account is needed.

## Requirements

- Python 3.11 or newer
- Ollama running locally

## Setup on Windows

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r backend/requirements.txt
Copy-Item .env.example .env
ollama pull nomic-embed-text
ollama pull qwen3:4b
ollama serve
```

If PowerShell blocks `Activate.ps1` because script execution is disabled, allow scripts only for the current terminal session, then activate again:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

Alternatively, skip activation and call the virtual environment executables directly:

```powershell
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
```

If Ollama already runs in the background, skip `ollama serve`. For a smaller CPU model, set `OLLAMA_LLM_MODEL=qwen3:1.7b` in `.env` and pull that model.

In another terminal, activate the same environment and run:

```powershell
uvicorn backend.main:app --reload
```

Without activating the environment, use `.\.venv\Scripts\python.exe -m uvicorn backend.main:app --reload` instead.

The Streamlit interface is available at `http://localhost:8501`. Start it in another terminal after the API is running:

```powershell
.\.venv\Scripts\streamlit.exe run frontend/app.py
```

Without activating the environment, the same command works; Streamlit displays a local URL, normally `http://localhost:8501`.

The interface lets you upload a text-based PDF, search its contents, and generate multiple-choice questions with page references. Detected lesson/unit headings appear as generation scopes; selecting one keeps retrieval inside that section. Re-upload documents indexed before section detection was added. `MAX_RETRIEVAL_DISTANCE` controls how strict semantic relevance filtering is (lower values reject more weak matches). Swagger UI remains available at [http://localhost:8000/docs](http://localhost:8000/docs). Scanned image PDFs need OCR and are rejected in this version.

Example generation request:

```json
{"document_id":"returned-uuid","topic":"sistem pernapasan","question_count":5,"difficulty":"medium","type":"multiple_choice"}
```

Run tests from the activated environment with `python -m pytest -q`. The tests use an isolated temporary Chroma store and a fake generator; they do not require Ollama. They cover PDF validation, the upload → search → generate → delete flow, source references, model failures, and invalid model output. For a live acceptance check, upload a real PDF, search a topic, generate questions, and verify the returned page references against the PDF. Uploaded files and persistent vectors are kept in `uploads/` and `chroma_data/` and ignored by Git.
