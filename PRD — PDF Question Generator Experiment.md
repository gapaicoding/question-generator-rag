# PRD — PDF Question Generator (Next.js Edition)

## 1. Informasi Proyek

**Nama Proyek:** PDF Question Generator\
**Versi:** v0.2 — Migrasi ke Next.js + Cloud\
**Status:** Planned\
**Tujuan:** Migrasi pipeline RAG dari stack lokal (FastAPI + Streamlit + Ollama + ChromaDB) menjadi aplikasi full-stack Next.js yang bisa di-deploy gratis ke Vercel, menggunakan LLM API cloud dan vector database hosted sebagai pengganti Ollama dan ChromaDB.

---

# 2. Latar Belakang

Versi v0.1 (lihat `CHANGELOG.md` dan riwayat commit) sudah membuktikan bahwa pipeline RAG — extract PDF → chunking → embedding → vector search → generate soal — bekerja secara lokal menggunakan Ollama dan ChromaDB.

Masalah pada v0.1 untuk kebutuhan deployment:

- Ollama adalah proses server yang harus menyala terus dan butuh RAM besar (model `qwen3:4b` perlu ±3 GB hanya untuk load weight). Ini tidak bisa berjalan di platform serverless seperti Vercel, dan tidak nyaman di VPS kecil (≤4 GB RAM, 1 vCPU).
- ChromaDB `PersistentClient` menyimpan data di filesystem lokal (`./chroma_data`). Filesystem di lingkungan serverless bersifat ephemeral, sehingga tidak bisa dipakai sebagai penyimpanan permanen.
- Streamlit sebagai frontend tidak cocok dideploy bersama Next.js/Vercel.

Versi v0.2 bertujuan menghilangkan dependensi pada proses server yang menyala terus (Ollama) dan penyimpanan disk lokal (ChromaDB file, `uploads/`), diganti dengan layanan cloud yang punya free tier, sambil mempertahankan seluruh logic RAG yang sudah terbukti bekerja (chunking per halaman, retrieval terskop per dokumen, generate soal grounded, source attribution).

---

# 3. Tujuan Migrasi

Flow fungsional **tidak berubah** dari v0.1:

```text
PDF
↓
Extract Text
↓
Chunking
↓
Generate Embedding
↓
Store in Vector DB
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

Yang berubah hanya **di mana** setiap langkah dieksekusi dan **teknologi** yang dipakai, bukan kontrak fungsionalnya:

| Langkah | v0.1 (lokal) | v0.2 (Next.js/cloud) |
|---|---|---|
| Server | FastAPI (Python) | Next.js API Routes (TypeScript) |
| UI | Streamlit | Next.js App Router (React) |
| PDF extraction | PyMuPDF | `pdf-parse` / `unpdf` (Node) |
| Embedding | Ollama + `nomic-embed-text` | Google Gemini `text-embedding-004` (API) |
| LLM generation | Ollama + `qwen3:4b` | Google Gemini `gemini-flash` (API) |
| Vector store | ChromaDB (file lokal) | Postgres + `pgvector` (Neon, hosted) |
| File upload storage | `./uploads/` lokal | Diproses in-memory saat upload, tidak perlu disimpan permanen |
| Hosting | Localhost | Vercel (Hobby, gratis) |

---

# 4. Scope

## 4.1 In Scope (v0.2)

1. Migrasi backend dari FastAPI ke Next.js API Routes.
2. Migrasi frontend dari Streamlit ke Next.js (App Router, React).
3. Upload PDF via form Next.js, diproses di API route (tanpa menyimpan file ke disk server).
4. Extract text per halaman menggunakan library Node (`pdf-parse` atau `unpdf`).
5. Chunking dengan metadata halaman (logic sama seperti `chunker.py`, ditulis ulang di TypeScript).
6. Generate embedding via Google Gemini embedding API.
7. Simpan chunk + embedding + metadata di Postgres (`pgvector`) hosted di Neon.
8. Semantic search terfilter per `document_id` (tidak boleh bocor antar dokumen, sama seperti v0.1).
9. Generate soal via Google Gemini LLM API, dengan prompt grounding yang sama seperti v0.1.
10. Structured output JSON (soal, pilihan, jawaban, penjelasan, referensi halaman) — schema tidak berubah dari v0.1.
11. Deploy ke Vercel (Hobby plan, gratis).
12. Environment variable untuk semua kredensial (Gemini API key, Neon connection string).

## 4.2 Out of Scope (v0.2)

- Ollama (dihapus total, diganti API cloud).
- ChromaDB (dihapus total, diganti `pgvector`).
- Streamlit (dihapus total, diganti Next.js UI).
- Penyimpanan file PDF permanen di server (tidak perlu, PDF diproses sekali saat upload lalu dibuang).
- Authentication, multi-user, role-based access.
- Payment.
- OCR / PDF hasil scan.
- Streaming response token-by-token (boleh ditambah di versi berikutnya, bukan wajib v0.2).
- Background worker/queue (Vercel function sudah cukup untuk skala eksperimen; jika PDF besar menyebabkan timeout, baru dipertimbangkan di v0.3).

---

# 5. Technology Stack

## Framework

```text
Next.js 14+ (App Router)
TypeScript
```

## Hosting

```text
Vercel (Hobby plan)
```

## PDF Processing

```text
pdf-parse atau unpdf (Node-compatible, jalan di serverless function)
```

## Embedding

```text
Google Gemini API — text-embedding-004 (free tier)
```

## LLM Generation

```text
Google Gemini API — gemini-flash / gemini-flash-lite (free tier)
```

Alternatif jika kuota Gemini habis atau butuh model open-source (mis. keluarga Qwen seperti v0.1):

```text
Groq API (free tier, cepat)
OpenRouter API (model :free, termasuk Qwen)
```

Provider harus dikonfigurasi lewat environment variable, bukan hardcoded, agar mudah berpindah tanpa mengubah source code (prinsip sama dengan v0.1 §11).

## Vector Database

```text
PostgreSQL + pgvector extension
Hosting: Neon (free tier, auto-sleep saat idle)
```

Alternatif: Pinecone (dedicated vector DB, free tier ~100.000 vector) jika tidak ingin mengelola skema SQL sendiri.

## Validation

```text
Zod (pengganti Pydantic schema di sisi TypeScript)
```

---

# 6. Target Environment

Deployment target menggantikan "development machine" di v0.1:

```text
Compute: Vercel serverless functions (Hobby plan, gratis)
Database: Neon Postgres + pgvector (free tier, 0.5 GB storage, 100 jam compute/bulan)
LLM & Embedding: Google Gemini API (free tier)
```

Batasan yang harus diperhatikan:

- Vercel Hobby function timeout terbatas (±10 detik default). PDF besar atau jumlah chunk banyak berisiko timeout — upload & indexing harus dipecah per batch kecil atau di-skip sebagian chunk kalau timeout mendekat.
- Neon free tier auto-scale ke nol saat idle — request pertama setelah idle lama (cold start database) akan sedikit lebih lambat.
- Free tier Gemini punya rate limit (±10-15 request/menit) — cukup untuk pemakaian personal/demo, tidak untuk banyak pengguna bersamaan.

---

# 7. High-Level Architecture

```text
                    ┌────────────────────┐
                    │   Browser (React)  │
                    │   Next.js UI       │
                    └─────────┬──────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │  Next.js API Routes│
                    │  (Vercel Function) │
                    └─────────┬──────────┘
                              │
                ┌─────────────┼──────────────┐
                │             │              │
                ▼             ▼              ▼
        ┌───────────────┐ ┌──────────┐ ┌───────────────┐
        │ PDF Parser    │ │ Gemini   │ │ Gemini        │
        │ (pdf-parse)   │ │ Embedding│ │ LLM Generate  │
        └───────┬───────┘ └────┬─────┘ └───────▲───────┘
                │              │               │
                ▼              ▼               │
        ┌───────────────┐ ┌──────────────┐     │
        │ Chunking      │→│ Neon Postgres│─────┘
        └───────────────┘ │ + pgvector   │
                           └──────────────┘
```

---

# 8. Recommended Project Structure

```text
pdf-question-generator/
│
├── app/
│   ├── page.tsx                 # UI utama (upload, search, generate)
│   ├── layout.tsx
│   └── api/
│       ├── documents/
│       │   └── route.ts         # POST upload, DELETE document
│       ├── search/
│       │   └── route.ts         # POST semantic search
│       └── generate/
│           └── route.ts         # POST generate questions
│
├── lib/
│   ├── config.ts                # Env var loader (ganti config.py)
│   ├── pdf-parser.ts            # ganti pdf_parser.py
│   ├── chunker.ts                # ganti chunker.py
│   ├── embeddings.ts             # panggil Gemini embedding API
│   ├── vector-store.ts           # query/insert ke Neon pgvector, ganti vector_store.py
│   ├── generator.ts              # panggil Gemini LLM + parsing JSON, ganti generator.py
│   └── schemas.ts                # Zod schema, ganti schemas.py
│
├── components/
│   ├── UploadForm.tsx
│   ├── SearchPanel.tsx
│   └── QuestionList.tsx
│
├── drizzle/ (atau prisma/)       # migration schema untuk pgvector
│
├── tests/
│   ├── chunker.test.ts
│   ├── vector-store.test.ts
│   └── api.test.ts
│
├── .env.example
├── .gitignore
├── package.json
├── README.md
└── PRD.md
```

---

# 9. Environment Variables

```env
GEMINI_API_KEY=

DATABASE_URL=                  # connection string Neon (postgres + pgvector)

DEFAULT_CHUNK_SIZE=1200
DEFAULT_CHUNK_OVERLAP=200
DEFAULT_TOP_K=5
MAX_RETRIEVAL_DISTANCE=1.2

MAX_PDF_BYTES=26214400         # 25MB, sama seperti v0.1
```

Tidak ada lagi `OLLAMA_BASE_URL`, `CHROMA_PATH`, `UPLOAD_PATH` — digantikan konfigurasi provider cloud di atas.

---

# 10. Functional Requirements

Kontrak API **tidak berubah** dari v0.1 (lihat perilaku di `backend/main.py` dan `backend/schemas.py` sebagai referensi), hanya dipindah ke Next.js route handler:

```text
POST /api/documents   → upload & index PDF
POST /api/search      → semantic search, terfilter document_id
POST /api/generate    → generate soal dari topik
DELETE /api/documents/:id → hapus document + vector terkait
GET  /api/health      → cek koneksi ke Gemini & Neon
```

Validasi, struktur output soal (`question`, `options`, `answer`, `explanation`, `sources[].page`), retrieval-before-generation, dan larangan LLM mengarang nomor halaman — semua requirement ini **tetap berlaku**, hanya implementasinya pindah bahasa/provider.

---

# 11. Structured Output Handling

Sama seperti v0.1 §26: Gemini API kadang membungkus JSON dengan markdown fence atau menambahkan teks lain. Route `generate` harus:

- membersihkan markdown fence sebelum `JSON.parse`;
- validasi hasil parse dengan Zod schema;
- maksimal satu retry dengan prompt koreksi jika invalid;
- return error terkontrol jika tetap gagal (bukan infinite retry).

---

# 12. Testing Requirements

```text
Vitest atau Jest (pengganti pytest)
```

Minimal test yang harus porting dari v0.1:

```text
chunker: ukuran chunk, overlap, metadata halaman tidak hilang
vector-store: insert, query, filter document_id, delete
api: health check, upload PDF invalid, generate dengan document tidak ada
```

Test Gemini API (embedding & generation) sebaiknya di-mock, dipisahkan dari unit test agar tidak bergantung kuota API saat CI berjalan.

---

# 13. Development Sequence

## Phase 1 — Setup Next.js & Database

```text
Inisialisasi project Next.js + TypeScript
Setup Neon project + enable pgvector extension
Buat schema tabel (documents, chunks dengan kolom vector)
```

## Phase 2 — PDF Processing (porting dari Python)

```text
Port pdf_parser.py → pdf-parser.ts
Port chunker.py → chunker.ts
Test unit untuk memastikan hasil chunking konsisten dengan v0.1
```

## Phase 3 — Embedding & Vector Store

```text
Integrasi Gemini embedding API
Implementasi insert/query ke pgvector
Test retrieval: similarity search terfilter document_id
```

## Phase 4 — Generation

```text
Port generator.py → generator.ts
Prompt grounding sama seperti v0.1 §23
Structured output parsing + retry sekali
```

## Phase 5 — API Routes & UI

```text
/api/documents, /api/search, /api/generate, /api/health
UI: UploadForm, SearchPanel, QuestionList
```

## Phase 6 — Deploy

```text
Push ke GitHub
Connect ke Vercel
Set environment variables (GEMINI_API_KEY, DATABASE_URL)
Deploy & verifikasi end-to-end di production URL
```

---

# 14. Coding Rules for AI Agent

1. Jangan overengineer — tetap port 1:1 logic dari versi Python kecuali memang perlu berubah karena keterbatasan serverless.
2. Pisahkan module berdasarkan responsibility, sama seperti struktur `backend/` di v0.1.
3. Gunakan TypeScript strict mode dan Zod untuk validasi request/response (pengganti Pydantic).
4. Jangan commit `.env`.
5. Jangan expose stack trace ke API response.
6. Fail jelas kalau Gemini API key tidak valid atau Neon tidak bisa diakses — jangan silent fail.
7. Jangan menambahkan dependency besar (LangChain, LlamaIndex) tanpa kebutuhan jelas.
8. Jalankan test setelah setiap phase besar, sama seperti v0.1 §38.20.

---

# 15. Definition of Done (v0.2)

- [ ] Next.js project berjalan lokal (`next dev`) dan di Vercel.
- [ ] Upload PDF berhasil diproses tanpa menyimpan file ke disk server.
- [ ] Chunking menghasilkan metadata halaman yang benar.
- [ ] Embedding berhasil dibuat via Gemini API.
- [ ] Chunk + embedding tersimpan di Neon pgvector.
- [ ] Semantic search terfilter per `document_id`.
- [ ] `/api/generate` menggunakan retrieved chunks (bukan seluruh PDF).
- [ ] Output soal sesuai schema v0.1 (options, answer, explanation, source page).
- [ ] Deploy ke Vercel berhasil dan bisa diakses publik.
- [ ] Environment variable terkonfigurasi di Vercel dashboard (tidak hardcode kredensial).
- [ ] README diperbarui dengan instruksi setup Next.js + Neon + Gemini dari nol.

---

# 16. Next Phase After v0.2

Jangan implementasikan sekarang. Kandidat tahap berikutnya setelah v0.2 stabil:

```text
v0.3
Streaming response saat generate soal

v0.4
Authentication (NextAuth) untuk multi-user

v0.5
Question review/edit UI

v0.6
Rate limiting & usage quota per user

v0.7
Dukungan tipe soal selain pilihan ganda
```

Keputusan tahap berikutnya hanya dilakukan setelah v0.2 tervalidasi berjalan stabil di production (Vercel + Neon + Gemini).
