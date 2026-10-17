# PRD — PDF Question Generator Experiment

## 1. Informasi Proyek

**Nama Proyek:** PDF Question Generator Experiment\
**Versi:** v0.1 Experimental\
**Status:** Ready for Development\
**Tujuan:** Membuktikan pipeline lokal untuk menghasilkan soal dan jawaban secara otomatis dari materi PDF menggunakan Ollama, embedding, ChromaDB, dan FastAPI.

---

# 2. Latar Belakang

Proyek ini merupakan eksperimen awal untuk membangun sistem yang dapat membaca materi pembelajaran dalam format PDF, mengubah isi PDF menjadi embedding, menyimpan embedding ke vector database, mengambil bagian materi yang relevan berdasarkan topik, lalu menghasilkan soal secara otomatis menggunakan LLM lokal.

Eksperimen ini harus dapat berjalan secara lokal tanpa menggunakan API AI berbayar.

Target utama pada fase ini bukan membuat aplikasi production-ready, melainkan membuktikan bahwa pipeline RAG dapat berjalan dengan benar dan menghasilkan soal yang grounded pada isi PDF.

---

# 3. Tujuan Eksperimen

Sistem harus mampu melakukan flow berikut:

```text
PDF
↓
Extract Text
↓
Chunking
↓
Generate Embedding
↓
Store in ChromaDB
↓
User memberikan topik
↓
Generate Query Embedding
↓
Similarity Search
↓
Retrieve relevant chunks
↓
Send context to LLM
↓
Generate Questions
↓
Return Structured JSON
```

Target akhir eksperimen:

```text
1 PDF
→ berhasil diproses
→ tersimpan sebagai chunks di ChromaDB
→ user memasukkan topik
→ sistem mengambil materi relevan
→ menghasilkan 5 soal pilihan ganda
→ memiliki jawaban
→ memiliki penjelasan
→ memiliki referensi halaman PDF
```

---

# 4. Scope

## 4.1 In Scope

Fitur yang wajib dibuat:

1. Upload file PDF.
2. Extract text menggunakan PyMuPDF.
3. Extract text per halaman.
4. Memecah text menjadi chunks.
5. Menyimpan metadata halaman pada setiap chunk.
6. Generate embedding menggunakan Ollama.
7. Embedding model menggunakan `nomic-embed-text`.
8. Menyimpan chunks dan embedding ke ChromaDB.
9. Semantic search berdasarkan topik.
10. Retrieve chunk paling relevan.
11. Generate soal menggunakan Ollama.
12. LLM menggunakan model Qwen kecil.
13. Mendukung soal pilihan ganda.
14. Mendukung konfigurasi jumlah soal.
15. Mendukung difficulty.
16. Menghasilkan output JSON terstruktur.
17. Menampilkan referensi sumber halaman.
18. Menyediakan REST API melalui FastAPI.
19. Menyediakan Swagger UI untuk testing.
20. Menyimpan ChromaDB secara persistent di lokal.

---

# 5. Out of Scope

Jangan implementasikan fitur berikut pada versi eksperimen:

- Next.js frontend.
- Supabase.
- PostgreSQL.
- pgvector.
- Authentication.
- User registration.
- Login.
- Teacher role.
- Student role.
- Admin dashboard.
- Payment.
- Cloud deployment.
- OCR.
- PDF scan/image recognition.
- Multiple users.
- Multi-tenant.
- Question history.
- Question editing UI.
- Quiz attempt.
- Automatic scoring.
- Analytics.
- Streaming response.
- Background worker.
- Queue system.
- Redis.
- Docker, kecuali dibutuhkan untuk development convenience.
- Cloud AI API.
- OpenAI API.
- Gemini API.
- Claude API.

Fokus hanya pada validasi pipeline AI lokal.

---

# 6. Technology Stack

Gunakan stack berikut.

## Backend

```text
Python 3.11+
FastAPI
Uvicorn
```

## PDF Processing

```text
PyMuPDF / fitz
```

## AI Runtime

```text
Ollama
```

## Embedding Model

```text
nomic-embed-text
```

## LLM

Prioritas:

```text
qwen3:4b
```

Jika terlalu berat pada mesin development:

```text
qwen3:1.7b
```

Agent harus membuat konfigurasi model melalui environment variable sehingga model dapat diganti tanpa mengubah source code.

---

# 7. Vector Database

Gunakan:

```text
ChromaDB
```

Mode:

```text
PersistentClient
```

Data harus disimpan lokal pada:

```text
./chroma_data/
```

Jangan menggunakan in-memory database untuk implementasi final eksperimen.

---

# 8. Target Environment

Development machine:

```text
OS:
Windows

Processor:
AMD Ryzen 5 PRO 4650U

RAM:
16 GB

GPU:
AMD Radeon integrated

AI inference:
CPU-first
```

Implementasi harus tetap ringan.

Jangan menggunakan model besar >7B sebagai default.

---

# 9. High-Level Architecture

```text
                    ┌────────────────────┐
                    │      User/API      │
                    └─────────┬──────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │      FastAPI       │
                    └─────────┬──────────┘
                              │
                ┌─────────────┴──────────────┐
                │                            │
                ▼                            ▼
        ┌───────────────┐            ┌───────────────┐
        │ PDF Processor │            │ Question      │
        │ PyMuPDF       │            │ Generator     │
        └───────┬───────┘            └───────▲───────┘
                │                            │
                ▼                            │
        ┌───────────────┐                    │
        │ Chunking      │                    │
        └───────┬───────┘                    │
                │                            │
                ▼                            │
        ┌───────────────┐                    │
        │ Ollama        │                    │
        │ Embedding     │                    │
        └───────┬───────┘                    │
                │                            │
                ▼                            │
        ┌───────────────┐                    │
        │ ChromaDB      │                    │
        └───────┬───────┘                    │
                │                            │
                ▼                            │
        ┌───────────────┐                    │
        │ Retrieval     │────────────────────┘
        └───────────────┘
```

---

# 10. Recommended Project Structure

Gunakan struktur berikut.

```text
pdf-question-generator/
│
├── backend/
│   │
│   ├── main.py
│   │
│   ├── config.py
│   │
│   ├── schemas.py
│   │
│   ├── pdf_parser.py
│   │
│   ├── chunker.py
│   │
│   ├── embeddings.py
│   │
│   ├── vector_store.py
│   │
│   ├── retriever.py
│   │
│   ├── generator.py
│   │
│   ├── ollama_client.py
│   │
│   └── requirements.txt
│
├── uploads/
│
├── chroma_data/
│
├── tests/
│   ├── test_pdf_parser.py
│   ├── test_chunker.py
│   ├── test_vector_store.py
│   └── test_api.py
│
├── .env.example
├── .gitignore
├── README.md
└── PRD.md
```

Agent boleh menambahkan file/helper lain jika diperlukan, tetapi jangan mengubah boundary utama sistem.

---

# 11. Environment Variables

Buat `.env.example`.

Minimal:

```env
OLLAMA_BASE_URL=http://localhost:11434

OLLAMA_LLM_MODEL=qwen3:4b

OLLAMA_EMBED_MODEL=nomic-embed-text

CHROMA_PATH=./chroma_data

UPLOAD_PATH=./uploads

DEFAULT_CHUNK_SIZE=1200

DEFAULT_CHUNK_OVERLAP=200

DEFAULT_TOP_K=5
```

Jangan hardcode konfigurasi model di banyak file.

---

# 12. Functional Requirements

## FR-01 — Health Check

Endpoint:

```http
GET /health
```

Response:

```json
{
  "status": "ok"
}
```

Idealnya juga melakukan pengecekan apakah Ollama dapat diakses.

Contoh:

```json
{
  "status": "ok",
  "ollama": true
}
```

---

# 13. FR-02 — Upload dan Index PDF

Endpoint:

```http
POST /documents
```

Input:

```text
multipart/form-data

file: PDF
```

Sistem harus:

1. Memvalidasi file PDF.
2. Menyimpan file sementara/lokal.
3. Membaca PDF.
4. Extract text per page.
5. Menghasilkan chunk.
6. Generate embedding untuk masing-masing chunk.
7. Menyimpan chunk ke ChromaDB.
8. Menyimpan metadata.
9. Mengembalikan document ID.

Example response:

```json
{
  "document_id": "uuid",
  "filename": "materi-ipa.pdf",
  "pages": 20,
  "chunks": 54,
  "status": "indexed"
}
```

---

# 14. PDF Extraction Requirement

Gunakan PyMuPDF.

Text harus dibaca per halaman.

Internal representation:

```python
[
    {
        "page": 1,
        "text": "..."
    },
    {
        "page": 2,
        "text": "..."
    }
]
```

Halaman harus menggunakan numbering manusia:

```text
1, 2, 3, ...
```

bukan zero-based numbering pada response API.

---

# 15. PDF Validation

Reject apabila:

- file bukan PDF;
- file kosong;
- PDF tidak memiliki text extractable;
- PDF corrupted.

Gunakan response HTTP yang sesuai.

Contoh:

```json
{
  "detail": "PDF contains no extractable text."
}
```

OCR tidak perlu diimplementasikan.

---

# 16. Chunking Requirement

Chunking tidak boleh hanya memotong text secara random tanpa metadata.

Setiap chunk minimal mempunyai:

```json
{
  "document_id": "...",
  "filename": "materi.pdf",
  "page": 12,
  "chunk_index": 7,
  "content": "..."
}
```

Target default:

```text
chunk size:
±1200 characters/tokens-equivalent sederhana

overlap:
±200
```

Tidak perlu implementasi tokenizer kompleks pada fase pertama.

Prioritaskan readable chunks.

Jangan menggabungkan metadata halaman yang salah.

---

# 17. Embedding Requirement

Gunakan Ollama endpoint embedding.

Model:

```text
nomic-embed-text
```

Flow:

```text
chunk text

↓

Ollama embedding API

↓

vector

↓

ChromaDB
```

Embedding harus dilakukan melalui reusable `ollama_client`.

Jangan membuat HTTP implementation Ollama berulang di banyak module.

---

# 18. ChromaDB Collection

Gunakan satu collection awal:

```text
pdf_materials
```

Setiap record:

```text
id
document
embedding
metadata
```

ID direkomendasikan:

```text
{document_id}:{page}:{chunk_index}
```

Contoh:

```text
a35d...:12:3
```

Metadata:

```json
{
  "document_id": "a35d...",
  "filename": "materi-ipa.pdf",
  "page": 12,
  "chunk_index": 3
}
```

---

# 19. Duplicate Handling

Jika PDF yang sama di-upload ulang pada eksperimen ini:

Pilihan sederhana diperbolehkan:

```text
buat document_id baru
```

Tidak perlu deduplication kompleks.

Namun Chroma record ID harus selalu unik.

---

# 20. FR-03 — Semantic Search

Endpoint:

```http
POST /search
```

Request:

```json
{
  "document_id": "uuid",
  "query": "sistem pernapasan manusia",
  "top_k": 5
}
```

Flow:

```text
query
↓
embedding
↓
Chroma similarity search
↓
filter document_id
↓
top K
```

Response:

```json
{
  "query": "sistem pernapasan manusia",
  "results": [
    {
      "content": "...",
      "page": 12,
      "chunk_index": 2,
      "distance": 0.12
    }
  ]
}
```

Search wajib terfilter berdasarkan `document_id`.

Tidak boleh mengambil context dari PDF lain.

---

# 21. FR-04 — Generate Questions

Endpoint:

```http
POST /generate
```

Request:

```json
{
  "document_id": "uuid",
  "topic": "sistem pernapasan manusia",
  "question_count": 5,
  "difficulty": "medium",
  "type": "multiple_choice"
}
```

Allowed difficulty:

```text
easy
medium
hard
```

Allowed type pada v0.1:

```text
multiple_choice
```

---

# 22. Retrieval Before Generation

Generator tidak boleh langsung menggunakan seluruh PDF.

Flow wajib:

```text
topic
↓
embedding
↓
Chroma
↓
top 5 relevant chunks
↓
build context
↓
LLM
```

Default:

```text
top_k = 5
```

---

# 23. Prompt Requirement

Prompt harus menginstruksikan LLM:

1. Gunakan hanya informasi dari context.
2. Jangan membuat fakta yang tidak ada pada context.
3. Buat jumlah soal sesuai request.
4. Berikan empat pilihan jawaban.
5. Hanya satu jawaban benar.
6. Berikan penjelasan.
7. Gunakan bahasa materi/user.
8. Return JSON.
9. Jangan menambahkan Markdown.
10. Jangan menggunakan knowledge eksternal jika tidak terdapat dalam materi.

Contoh instruksi inti:

```text
You are an educational question generator.

Use ONLY the supplied source material.

Do not introduce facts that are not supported by the source.

Generate the requested number of questions.

Return valid JSON only.
```

---

# 24. Question Output Schema

Response harus normalized menjadi:

```json
{
  "document_id": "uuid",
  "topic": "sistem pernapasan manusia",
  "difficulty": "medium",
  "questions": [
    {
      "question": "Apa fungsi utama alveolus?",
      "options": [
        "Memompa darah",
        "Tempat pertukaran gas",
        "Menghasilkan enzim",
        "Menyaring darah"
      ],
      "answer": "Tempat pertukaran gas",
      "explanation": "Alveolus menjadi lokasi pertukaran oksigen dan karbon dioksida.",
      "sources": [
        {
          "page": 12
        }
      ]
    }
  ]
}
```

---

# 25. Source Attribution

Setiap batch pertanyaan harus menyimpan informasi source context.

Minimal:

```text
page
```

Lebih baik:

```json
{
  "page": 12,
  "chunk_index": 3
}
```

Untuk eksperimen, source tidak harus akurat sampai level kalimat.

Tetapi halaman sumber harus berasal dari retrieved chunks.

LLM tidak boleh mengarang nomor halaman.

Nomor halaman sebaiknya di-attach oleh backend berdasarkan retrieved context.

---

# 26. Structured Output Handling

LLM kadang menghasilkan:

````text
```json
...
````

````

atau tambahan text.

Backend harus mempunyai mekanisme robust untuk:

- membersihkan markdown fence;
- parse JSON;
- mendeteksi invalid JSON.

Jika parsing gagal:

- lakukan maksimal satu retry dengan prompt koreksi;
- jika tetap gagal, return controlled error.

Jangan melakukan infinite retry.

---

# 27. FR-05 — Delete Document

Optional tetapi disarankan.

Endpoint:

```http
DELETE /documents/{document_id}
````

Harus menghapus vector/chunk terkait document tersebut dari ChromaDB.

File lokal juga boleh dihapus.

Response:

```json
{
  "document_id": "...",
  "status": "deleted"
}
```

---

# 28. API Summary

Minimal endpoint:

```text
GET    /health

POST   /documents

POST   /search

POST   /generate
```

Recommended:

```text
DELETE /documents/{document_id}
```

Swagger tersedia melalui:

```text
/docs
```

---

# 29. Error Handling

Backend harus memiliki error yang jelas.

Contoh:

### Ollama unavailable

```json
{
  "detail": "Ollama service is unavailable."
}
```

### Model unavailable

```json
{
  "detail": "Required Ollama model is not installed."
}
```

### Invalid document

```json
{
  "detail": "Document not found."
}
```

### No relevant context

```json
{
  "detail": "No relevant source material found for this topic."
}
```

### LLM invalid output

```json
{
  "detail": "LLM returned invalid structured output."
}
```

Jangan expose stack trace ke API response.

---

# 30. Logging

Gunakan logging sederhana.

Log minimal:

```text
PDF uploaded
PDF parsed
Number of pages
Number of chunks
Embedding started
Embedding completed
Chroma insert completed
Retrieval query
Retrieved chunk count
LLM generation started
LLM generation completed
Parsing error
```

Jangan mencetak seluruh isi PDF ke log.

---

# 31. Performance Requirement

Karena environment terbatas:

- proses embedding sequential diperbolehkan;
- batching boleh dilakukan jika sederhana;
- tidak perlu parallel worker;
- tidak perlu async queue;
- jangan load model secara manual ke Python memory;
- seluruh inference melalui Ollama.

Sistem tidak wajib cepat.

Yang penting stabil dan berhasil.

---

# 32. Security Scope

Eksperimen hanya localhost.

Tetap implementasikan:

- validasi MIME/file extension;
- batas ukuran PDF.

Default:

```text
max PDF:
25 MB
```

Tidak perlu authentication.

Tidak perlu rate limiting.

---

# 33. Testing Requirements

Gunakan `pytest`.

Minimal test:

## PDF parser

```text
valid PDF → pass
empty PDF → controlled error
```

## Chunker

```text
small text
large text
overlap
page metadata preserved
```

## Vector Store

```text
insert
query
filter document_id
delete
```

## API

```text
GET /health

invalid PDF upload

generate with unknown document
```

Ollama integration test boleh dipisahkan agar tidak selalu berjalan pada unit test.

---

# 34. Manual Acceptance Test

Agent harus memastikan flow berikut bekerja.

## Test Case 1 — Index PDF

Given:

```text
materi IPA.pdf
```

When:

```text
POST /documents
```

Expected:

```text
HTTP 200
document_id returned
pages > 0
chunks > 0
```

---

## Test Case 2 — Search

Given:

```text
document already indexed
```

When:

```text
query:
"sistem pernapasan"
```

Expected:

```text
3–5 relevant chunks returned
page metadata available
```

---

## Test Case 3 — Generate

When:

```json
{
  "topic": "sistem pernapasan",
  "question_count": 5,
  "difficulty": "medium"
}
```

Expected:

```text
exactly 5 questions

each question:
4 options
1 answer
explanation
source page
```

---

# 35. Definition of Done

Eksperimen dianggap selesai jika semua kondisi berikut terpenuhi.

- [ ] Ollama dapat terhubung dari backend.
- [ ] `nomic-embed-text` dapat menghasilkan embedding.
- [ ] Qwen dapat menghasilkan response.
- [ ] PDF dapat di-upload.
- [ ] PDF dapat di-extract.
- [ ] Text berhasil di-chunk.
- [ ] Metadata page tidak hilang.
- [ ] Chunks tersimpan di ChromaDB.
- [ ] Chroma persistent setelah backend restart.
- [ ] Semantic search bekerja.
- [ ] Search dapat difilter berdasarkan document ID.
- [ ] `/generate` menggunakan retrieved chunks.
- [ ] Sistem menghasilkan soal pilihan ganda.
- [ ] Output berupa valid JSON.
- [ ] Jumlah soal sesuai parameter.
- [ ] Setiap soal memiliki 4 options.
- [ ] Setiap soal memiliki answer.
- [ ] Setiap soal memiliki explanation.
- [ ] Source page tersedia.
- [ ] Swagger API berjalan.
- [ ] Basic automated tests pass.
- [ ] README berisi instruksi setup dari nol.

---

# 36. README Requirement

README harus mempunyai langkah berikut.

## Requirements

```text
Python
Ollama
```

## Setup

```bash
python -m venv .venv
```

Windows:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install:

```bash
pip install -r backend/requirements.txt
```

Model:

```bash
ollama pull nomic-embed-text
ollama pull qwen3:4b
```

Run:

```bash
uvicorn backend.main:app --reload
```

Test:

```text
http://localhost:8000/docs
```

---

# 37. Development Sequence

AI agent harus mengimplementasikan berdasarkan urutan berikut.

## Phase 1 — Foundation

Implement:

```text
config
FastAPI
health
Ollama client
```

Verify Ollama.

---

## Phase 2 — PDF Processing

Implement:

```text
PDF upload
PyMuPDF extraction
page metadata
chunking
```

Test sebelum lanjut.

---

## Phase 3 — Embedding

Implement:

```text
nomic embedding
```

Pastikan vector berhasil dibuat.

---

## Phase 4 — ChromaDB

Implement:

```text
persistent collection
insert
search
filter
delete
```

Test retrieval secara terpisah.

---

## Phase 5 — RAG

Implement:

```text
topic
↓
embedding
↓
retrieval
↓
context
```

Verifikasi retrieved text relevan sebelum menghubungkan ke LLM.

---

## Phase 6 — Question Generation

Implement:

```text
prompt
Qwen
structured JSON
validation
```

---

## Phase 7 — API Integration

Expose:

```text
/documents
/search
/generate
```

---

## Phase 8 — Tests and Documentation

Implement:

```text
pytest
README
.env.example
manual verification
```

---

# 38. Coding Rules for AI Agent

Agent harus mengikuti aturan berikut.

1. Jangan overengineer.
2. Jangan membuat frontend.
3. Jangan menambahkan database selain ChromaDB.
4. Jangan menggunakan LangChain pada versi pertama.
5. Jangan menggunakan LlamaIndex.
6. Jangan menggunakan API AI eksternal.
7. Gunakan direct Ollama API.
8. Pisahkan module berdasarkan responsibility.
9. Jangan membuat satu file Python besar.
10. Gunakan type hints.
11. Gunakan Pydantic schema untuk API request/response.
12. Gunakan environment variables.
13. Jangan commit `.env`.
14. Jangan commit PDF hasil upload.
15. Jangan commit isi `chroma_data`.
16. Tambahkan semua runtime artifacts ke `.gitignore`.
17. Jangan menambahkan dependency tanpa kebutuhan.
18. Fail clearly jika Ollama mati.
19. Fail clearly jika model belum terinstall.
20. Jalankan test setelah setiap phase besar.

---

# 39. Dependencies

Target `requirements.txt` tetap minimal.

Contoh:

```text
fastapi
uvicorn[standard]
python-multipart
PyMuPDF
chromadb
requests
python-dotenv
pydantic
pytest
httpx
```

Agent boleh menyesuaikan versi package dan dependency transitive jika diperlukan.

---

# 40. Explicit Non-Goals for AI Agent

AI agent DILARANG secara otomatis:

```text
membuat Next.js
membuat Supabase
membuat pgvector
membuat login
membuat Docker deployment
membuat cloud deployment
menambahkan LangChain
menambahkan Redis
menambahkan Celery
menambahkan authentication
menambahkan payment
```

kecuali diminta pada batch lanjutan.

---

# 41. Expected Experiment Result

Setelah project berjalan, tester harus bisa:

### Step 1

Run:

```bash
ollama serve
```

### Step 2

Run:

```bash
uvicorn backend.main:app --reload
```

### Step 3

Buka:

```text
http://localhost:8000/docs
```

### Step 4

Upload:

```text
materi-ipa.pdf
```

### Step 5

Receive:

```json
{
  "document_id": "...",
  "pages": 30,
  "chunks": 80
}
```

### Step 6

Call:

```http
POST /generate
```

dengan:

```json
{
  "document_id": "...",
  "topic": "sistem pernapasan",
  "question_count": 5,
  "difficulty": "medium",
  "type": "multiple_choice"
}
```

### Step 7

Receive:

```json
{
  "questions": [
    {
      "question": "...",
      "options": [
        "...",
        "...",
        "...",
        "..."
      ],
      "answer": "...",
      "explanation": "...",
      "sources": [
        {
          "page": 10
        }
      ]
    }
  ]
}
```

Jika flow tersebut berhasil secara konsisten, eksperimen v0.1 dinyatakan berhasil.

---

# 42. Next Phase After Experiment

Jangan implementasikan sekarang.

Jika eksperimen berhasil, kemungkinan tahap berikut:

```text
v0.2
Frontend Next.js

v0.3
Question review/edit

v0.4
Multiple question types

v0.5
Supabase authentication

v0.6
ChromaDB → pgvector migration

v0.7
Teacher/student workflow

v0.8
Deployment
```

Keputusan tahap berikut hanya dilakukan setelah kualitas retrieval dan question generation pada v0.1 tervalidasi.
