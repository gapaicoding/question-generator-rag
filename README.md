# PDF Question Generator

Next.js app that extracts text from a PDF, embeds page-aware chunks with the Google Gemini API, stores them in Postgres (`pgvector`) on Neon, and generates grounded multiple-choice questions. Deployable for free on Vercel: no local LLM or GPU required.

## Requirements

- Node.js 20+
- A [Google AI Studio](https://aistudio.google.com/) API key (Gemini)
- A [Neon](https://neon.tech) Postgres project with the `vector` extension

## Setup

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local`:

```env
GEMINI_API_KEY=...
DATABASE_URL=postgresql://...neon.tech/...?sslmode=require
```

Apply the database schema (creates the `vector` extension, `documents` and `chunks` tables):

```bash
npm run db:migrate
```

Run the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Upload a text-based PDF, then generate multiple-choice questions grounded in its content with page references. Detected lesson/unit/bab/chapter headings appear as generation scopes; mentioning one in the topic (e.g. "soal untuk bab 3") keeps retrieval inside that section. `MAX_RETRIEVAL_DISTANCE` in `.env.local` controls how strict semantic relevance filtering is. Scanned image PDFs need OCR and are rejected.

## Testing

```bash
npm test
```

Covers chunking (page metadata, word-boundary splitting with overlap, section detection). API routes are exercised manually against a real Gemini key and Neon database; there is no mocked integration suite yet.

## Deployment

```bash
npx vercel
```

Set `GEMINI_API_KEY` and `DATABASE_URL` (plus any non-default `GEMINI_MODEL`/`GEMINI_EMBED_MODEL`) in the Vercel project's Environment Variables, matching `.env.example`.

## Architecture

See `PRD — PDF Question Generator Experiment.md` for the full spec. In short: PDF upload → `pdf-parse` extraction → chunking with page/section metadata → Gemini embeddings → `pgvector` storage → semantic search scoped to the document (and section, if requested) → Gemini generates structured JSON questions validated against the retrieved context.
