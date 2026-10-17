# Changelog

All notable changes to this project are documented here.

## [Unreleased]

### Changed

- Migrated the stack from Python (FastAPI + Streamlit + Ollama + ChromaDB) to Next.js (TypeScript, App Router), deployable for free on Vercel. Chunking, PDF extraction, retrieval, and generation logic were ported 1:1 to TypeScript.
- Replaced Ollama with the Google Gemini API: `gemini-embedding-001` for embeddings (768-dim, via `outputDimensionality`), `gemini-3.8-flash` for generation.
- Replaced ChromaDB with Postgres + `pgvector` hosted on Neon.
- Replaced the Streamlit UI with a React UI: upload, search, generate, and document management with multi-document switching.
- Replaced `pdf-parse` with `unpdf` after `pdf-parse`'s `pdfjs-dist` dependency crashed on Vercel's serverless runtime (`ReferenceError: DOMMatrix is not defined`, a browser-only API pdf-parse's bundled PDF.js build referenced outside a DOM).

### Added

- `GET /api/documents` endpoint and a `DocumentList` component so multiple indexed documents can be browsed and switched between, instead of only ever working with the most recent upload.
- `DESIGN.md` declaring explicit design direction (calm/utility, dial ENERGY 1 / RHYTHM 1 / MOTION 1).
- Manual light/dark theme toggle (`components/ThemeToggle.tsx`) with `localStorage` persistence and a head-inline anti-FOUC script.
- `scripts/migrate.ts` to apply the Neon schema (`documents`, `chunks` + `pgvector`, `ivfflat` index).

### Fixed

- Dark-mode text contrast failures: `text-zinc-500`/`text-red-600` with no `dark:` override measured below WCAG AA 4.5:1 on the dark background; added `dark:text-zinc-400`/`dark:text-red-400` across `DocumentList`, `SearchPanel`, `QuestionList`, `UploadForm`, and `page.tsx`.
- Missing loading state on the initial document list fetch, and a missing "no results" empty state in search.
- Under-sized "Hapus" delete button tap target, now a 44×44px minimum.
- Card/input border contrast (raised from ~1.3-1.9:1 to `zinc-500`, clearing the 3:1 non-text guideline in both themes).
- Hydration mismatch warning from the theme-init script mutating `<html>`'s class before React hydrates (`suppressHydrationWarning` on the intentional mismatch).

### Verification

- `npm run build`: compiles clean, all 5 API routes present, no TypeScript errors.
- Verified end-to-end against the live Gemini API and Neon database, locally and in production on Vercel: upload, search, generate, and delete all tested with real requests.
- antislop audit (`anti-slop/audit-001-2026-10-17.md`): 7 findings (contrast, loading/empty states, tap targets, theme toggle, design direction, mobile verification), all fixed and re-verified via the contrast checker and Playwright at 375px/360px with zero console errors.

## [0.1.0] - 2026-10-17

### Added

- Streamlit interface for uploading PDF materials, searching document content, generating multiple-choice questions, and viewing answer explanations with page references.
- API lifecycle tests covering upload, search, generation, deletion, scanned PDFs, Ollama failures, and invalid generated output.
- Regression tests for lesson-heading detection, section-filtered vector search, automatic lesson scope detection, and rejection of weak or insufficient context.
- Chaos tests with injected Ollama timeouts and ChromaDB insert, search, generation-path, and delete failures.
- Windows setup guidance for PowerShell execution policies and running the virtual environment without activation.

### Changed

- Added lesson/section detection to document chunks, a generation scope selector, prompt-based lesson scope detection, and section-filtered retrieval to prevent mixing content across lessons.
- Added full-document semantic retrieval fallback for PDFs without detectable section headings, with UI guidance to focus prompts on document content.
- Added relevance-distance and minimum-context checks so generation stops with guidance when retrieved PDF evidence is weak or too short for the requested number of questions.
- Strengthened generation instructions to keep questions within the selected document section and uploaded source material.
- Added controlled 500 responses for unexpected search, generation, and deletion failures, plus cleanup of partial index/file state after upload indexing failures.
- Added JSON Schema constrained generation for Ollama and safe parser diagnostics with JSON error location/response length; validation logs avoid recording generated or source text.
- Replaced the quiz topic field with a freeform prompt so users can describe the desired focus or question guidance; generation remains grounded in the uploaded PDF.
- Improved UI status and error messages for unavailable services, missing Ollama models, scanned PDFs, and searches without relevant material.
- Added visible progress steps and persistent completion/error states for PDF upload/indexing, search, generation, and document deletion.
- Expanded recovery guidance for corrupted or oversized PDFs, unsupported formats, Ollama timeouts, and invalid generated output.
- Set the Streamlit upload limit to match the API limit of 25 MB.
- Moved pytest's temporary directory to `.pytest_tmp_e2e` to avoid Windows cleanup permission errors.

### Verification

- `python -m pytest -q`: 23 passed, 1 dependency deprecation warning.
- Local Ollama JSON Schema acceptance: uploaded a one-page PDF, generated 2 valid questions with matching answers/options and page sources, then deleted the test document.
- Local Ollama acceptance flow with a 3-page lesson PDF: upload/index, search, generate 5 questions scoped to Lesson 1, verify answer-option structure and source pages, then delete the test document.
- Playwright UI flow: PDF upload/indexing, search, question generation, answer/source display, and test document cleanup passed.
