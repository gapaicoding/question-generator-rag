# DESIGN.md — PDF Question Generator

> **Version:** 2.0  
> **Updated:** 18 October 2026  
> **Status:** UI/UX implementation specification  
> **Scope:** Full existing dashboard: upload/index PDF, indexed documents, optional material search, and question generation.  
> **Reference:** Latest approved full-page dark-mode mockup (`a_detailed_dark_themed_ui_dashboard_mockup_clean.png`).

## 1. Goals and constraints

Redesign the **existing** PDF Question Generator as a coherent, responsive learning-content workspace, preserving its functional workflows and existing API contracts. The latest reference includes all four sections below the fold; **do not stop at Upload PDF and Dokumen Terindeks**.

- Improve hierarchy, document readability, visual grouping, feedback, and accessibility.
- Make the **active document** visible, because the existing interface generates questions from the active document.
- Support optional material search without making it a prerequisite for question generation.
- Use real backend data and existing actions; the screenshot's text, dates, counts, and metadata are samples.
- **Frontend redesign only**: do not change PDF parsing, chunking, embedding, RAG retrieval, question generation logic, backend endpoints, persistence, or business rules.
- Do not introduce unsupported functionality simply because it appears in the visual mockup. A *Details* action, max-file-size badge, document dropdown, and automatic indexing shown in the design must be conditional on actual product/backend support.

## 2. Full-page information architecture

```text
PDF Question Generator (single scrollable page)
├── Header: gradient app icon, title/subtitle, light/dark toggle
├── 1. Upload PDF
│   ├── Section heading and helper text
│   ├── PDF drag-and-drop / native picker
│   ├── Selected file and validation feedback
│   ├── Upload & Index (explicit action: retain existing behavior)
│   └── Upload/index loading/success/error feedback
├── 2. Dokumen Terindeks
│   ├── Heading, optional local filename filter
│   ├── Document stats (optional, derived from actual data)
│   └── Indexed document rows
│       ├── PDF icon / filename / page & chunk counts
│       ├── Lesson tags / indexed timestamp
│       ├── Active/inactive indicator
│       ├── Select/activate action (existing behavior)
│       └── Delete (confirmation)
├── 3. Cari materi (opsional)
│   ├── Keyword input (e.g. 'sistem pernapasan')
│   ├── Cari button
│   └── Search result / empty / loading / error state
└── 4. Generate Soal
    ├── Current active document name
    ├── Topic text field (optional; keep actual API semantics)
    ├── Jumlah soal numeric input (example default: 5)
    ├── Tingkat kesulitan dropdown (example: Medium)
    ├── Generate Soal button
    └── Generation progress / result / error (existing workflow)
```

**Behavioral source of truth:** The original screenshot displays an `Aktif` chip on one document and dynamically titles the generator `Generate Soal dari "<nama dokumen>"`. Preserve that relationship. A document selector in the mockup is a visual proposal, not evidence of an existing selection API; it may be implemented only if it maps safely to existing document-activation behavior.

## 3. Visual style and tokens

Aim for a refined SaaS interface: dark navy/charcoal page, layered dark cards, subtle cool borders, indigo/violet/blue gradient CTAs, restrained glows, clear type. Use a single visual language across **all four sections**.

### 3.1 Palette (approximate implementation targets)

| Token | Dark value | Usage |
|---|---|---|
| `--bg-page` | `#0A1020` | Page background |
| `--bg-card` | `#111B2E` | Section surfaces |
| `--bg-raised` | `#152039` | Inner rows and inputs |
| `--bg-hover` | `#1D2B47` | Hover/drag-over state |
| `--border` | `#2B3B57` | Card and input outlines |
| `--text-primary` | `#F4F7FF` | Headings, important fields |
| `--text-secondary` | `#B6C5DE` | Metadata and helper text |
| `--text-muted` | `#8D9DBB` | Placeholders |
| `--accent-blue` | `#3290FF` | Blue accent / gradient start |
| `--accent-purple` | `#9547F5` | Violet accent / gradient end |
| `--accent-green` | `#22C987` | Active status and search icon |
| `--danger` | `#FF596E` | Deletion and errors |

Primary action: `linear-gradient(100deg, #3290FF, #655CF7, #9547F5)`. Avoid using gradients for every control; reserve them for primary CTAs and small section glyphs. Never use color as the only distinction for active status.

**Light palette:** page `#F5F7FC`, card `#FFFFFF`, raised `#F6F8FD`, border `#D9E2EF`, primary text `#17233A`, secondary text `#53627B`; reuse accents after checking contrast. Persist theme with existing mechanism if provided.

### 3.2 Typography, spacing, elevations

- Font: Inter or current application sans-serif (`system-ui` fallback).
- Main title: desktop `30–34px/1.2`, mobile `23–26px`; section headings `20–22px`, semibold/bold.
- Filename: `14–16px`, weight `600`; body `14–16px`; metadata `12–13px`.
- Spacing scale: `4 / 8 / 12 / 16 / 20 / 24 / 32 / 40px`.
- Page container `max-width: 1160px`, centered; desktop horizontal padding `24–32px`.
- Section vertical gaps `16–24px`; cards `16–20px` radius, `18–26px` padding; document rows `10–14px` radius.
- Border `1px`; shadows/glow subtle and nonessential; transitions `150–200ms`, respecting reduced motion.
- Icons should be consistent (e.g. Lucide), with accessible text labels on controls.

## 4. Layout and responsive behavior

| Screen | Layout |
|---|---|
| Desktop `>=1024px` | One centered content column; full-width cards, document metadata/actions in a row, generation fields in a 2-column grid. |
| Tablet `768–1023px` | Same card order; metadata and controls may wrap; generation grid can stay two columns if readable. |
| Mobile `<768px` | `16px` page padding; all four cards stack; document content/actions wrap; search input/button stack as necessary; generate form is single-column; CTA full-width. |

On mobile, long filenames must wrap or ellipsize with accessible full name, controls remain tappable (target ~`44×44px`), lesson chips wrap, and the page must have **no horizontal overflow**. Header theme control can move below or alongside the title. The full interface is a continuous vertical page, not four routes.

## 5. Component and behavior specifications

### 5.1 Header

Gradient document/sparkle icon; title `PDF Question Generator`; subtitle `Upload dokumen, cari materi, dan generate soal secara otomatis.`; theme toggle (`Light mode` in dark theme, `Dark mode` in light theme) with accessible name and pressed state. Static copy does not receive skeleton loaders.

### 5.2 Upload PDF

Heading `Upload PDF`, guidance `Pilih file PDF materi pembelajaran untuk diproses dan diindeks.`. Dotted/dashed drop zone: upload icon, `Drag & drop file PDF di sini`, secondary guidance, `Pilih File PDF` picker button. Show selected file name and size. Accepted type PDF only; maximum size follows **actual backend validation**, not the mockup's illustrative `Maks. 100 MB` badge. Never present a non-existent enforced limit.

Keep the **existing explicit** `Upload & Index` action. Do not silently switch to auto-upload from the reference image. Disable CTA until valid selection; during upload/indexing disable duplicates. Indicate upload vs indexing stages, and show only genuine progress percentages if available. On successful indexing refresh documents and any summary counters. Preserve backend duplicate-file semantics.

### 5.3 Dokumen Terindeks

Heading `Dokumen Terindeks`; optional subtitle. Each row contains a PDF icon, full filename, page count, chunk count, detected lessons, localized date/time, status, and actions.

- **Active status:** labeled green `Aktif` chip for the document used by generation. Inactive document may show `Nonaktif` or no chip according to true backend state; do not infer active merely from row order.
- **Activate/select:** if existing UI allows activation, retain that action, show pending status, and update the generation section only after activation succeeds. If current backend provides no selection action, leave the active state read-only.
- **Delete:** icon/menu with accessible `Hapus <filename>`; use a confirmation modal that distinguishes removing an index from deleting the source PDF if applicable. Use immutable IDs, never filename alone; duplicates in screenshot have same name.
- **Details:** only show `Lihat Detail` if there is already a real supported detail view/action. Otherwise omit (do not make an inert button).
- **Stats:** counts like total indexed documents and total chunks are optional, but must be computed from authoritative records with consistent scope; mockup samples are **not** constants.
- **Search/filter documents:** optional local client-side filename filter. This is distinct from the *Cari materi* semantic/content search below; keep their labels and results conceptually separate.
- **Lesson badges:** display backend-derived lesson names, wrap as chips if available; gracefully handle documents with no lessons or metadata.

States: initial loading, empty, load error with retry, delete pending/error, and current document highlighted without relying on color alone.

### 5.4 Cari materi (opsional)

Heading `Cari materi (opsional)`; helper `Tambahkan kata kunci untuk memfokuskan materi dari dokumen.`. One keyword input (`mis. sistem pernapasan`) plus secondary green-outline `Cari` button, search icon, keyboard Enter submission. Do not submit blank trimmed terms unless existing search behavior explicitly supports it.

Searching is **not mandatory** to generate a question. Preserve current search request, document scope, and result semantics. Display any returned material results in an accessible panel immediately below the search row using actual snippets/metadata when available. If search returns nothing, show neutral `Materi tidak ditemukan.`; on errors offer retry. Do not present fabricated chunks, relevance scores, citations, or AI answers. Clear/reset behavior follows existing UI.

### 5.5 Generate Soal

Heading `Generate Soal`, subtitle `Buat soal otomatis dari dokumen yang dipilih.`. Show the **actual current active document** as context (original UI: `Generate Soal dari "<filename>"`). If a document selector is added, it must be backed by existing activation logic, not a purely visual dropdown.

| Field | UI | Semantics |
|---|---|---|
| Dokumen | Current active document; optional supported selector | Must match the document passed to generation. |
| Topik | Text input, placeholder `Topik, mis. sistem pernapasan manusia` | Optional only if backend genuinely allows omission; otherwise explain required input. |
| Jumlah soal | Number input, sample value `5` | Positive integer, bounded by actual API constraints; don't invent maximum. |
| Tingkat kesulitan | Select, screenshot shows `Medium` | Values/options and submitted enum exactly match the existing backend. Do not assume translated display text is an API value. |
| Generate Soal | Full-width gradient primary button | Calls existing generation action once with existing payload. |

Layout: desktop two-column grid for document/topic and count/difficulty; full-width action underneath. On mobile, stack in reading order. Preserve form state when reasonable, disable Generate when no active document/invalid form or request is in flight, and provide descriptive validation errors.

**Generation states:** idle, submitting/generating (progress feedback without made-up percentages), succeeded (render existing result/answer-key UI or navigate exactly as already implemented), empty result, failed (retry without duplicate submission). A result design is not visible in either screenshot; **do not invent result layout/response contracts** beyond existing application functionality.

### 5.6 Empty/error/confirmation UX

- Upload: invalid type/size, upload failure, indexing failure, success.
- Document list: loading, no documents, fetch error, delete confirmation, delete success/failure.
- Material search: loading, no hits, results, error.
- Generation: no active document, invalid count/topic, loading, success, error.
- Skeletons appear only where variable data loads, **not** on static headings or fixed help text.
- Use real error messages mapped to safe user-facing copy (no stack traces, tokens, internal paths).

## 6. Accessibility

Target WCAG 2.2 AA: text contrast `>=4.5:1` (normal text), meaningful non-text elements `>=3:1` as applicable, visible focus rings, logical heading/Tab order, proper label-to-input association, Esc/keyboard focus management in dialogs, and `aria-live` for asynchronous status. Native picker must remain available for people who cannot drag-and-drop. Avoid icons or color alone as labels; avoid fake disabled states. Format timestamps according to application locale/timezone.

## 7. UI-facing data model (conceptual, not API contract)

```ts
type IndexedDocumentView = {
  id: string;                 // stable backend identifier
  filename: string;
  pageCount: number | null;
  chunkCount: number | null;
  lessons: string[];
  indexedAt: string | null;
  isActive: boolean;          // derive from authoritative selection state
};

type GenerateFormView = {
  activeDocumentId: string | null;
  topic: string;
  questionCount: number;
  difficulty: string;          // retain actual backend enum mapping
};
```

Adapt this shape through selectors/adapters if necessary, rather than changing existing endpoint payloads. The original screenshot shows two documents with identical filenames; actions MUST identify records by ID. Optional statistics must be scoped correctly when pagination/filtering exists.

## 8. Suggested frontend components

```text
src/
  components/
    app-header.tsx
    theme-toggle.tsx
    pdf-upload-card.tsx
    pdf-dropzone.tsx
    upload-status.tsx
    indexed-documents-card.tsx
    document-row.tsx
    document-status-badge.tsx
    delete-document-dialog.tsx
    material-search-card.tsx
    material-search-results.tsx
    generate-questions-card.tsx
    generation-status.tsx
    ui/...
  hooks/           # reuse existing API/state hooks
  styles/          # design tokens/theme
```

Component paths are indicative; align with current repository's framework, naming and design-system conventions. A large structural rewrite is not necessary.

## 9. Codex implementation sequence

1. Inspect present frontend, component structure, endpoints/hooks, active-document state, search workflow, generation options/output, and existing tests.
2. Introduce tokens and themed layout without changing data contracts.
3. Refactor header, upload, and indexed documents including active badge and deletion confirmation.
4. Implement the **Cari materi** section with existing request/result state and clear separation from filename filtering.
5. Implement the **Generate Soal** configuration using real active document, validation, API enum values, and existing result-handling flow.
6. Add loading, empty, success, failure, keyboard, accessibility, and responsive behaviors to all four sections.
7. Run the repo's lint, typecheck, unit/integration tests, build, and browser smoke tests at 375px, 768px, 1280px; verify zero horizontal overflow and preserved real workflows.

### Ready-to-use Codex prompt

> Read `DESIGN.md` version 2.0 and inspect the existing PDF Question Generator code before editing. Redesign the complete single-page dashboard to match the latest full-page dark-mode mockup, including Upload PDF, Dokumen Terindeks with active document state, Cari materi (opsional), and Generate Soal. Preserve all existing backend endpoints, question-generation semantics, selected active document, search/indexing flows, and result rendering. Use live data, not screenshot constants. Treat optional mockup-only features (document details, dropdown selection, size limit badge, auto-indexing) as non-requirements unless already supported. Implement responsive, accessible dark/light styles and all asynchronous states. Test the original workflows end to end, run lint/typecheck/build, and report modified files and test outcomes.

## 10. Acceptance criteria

- [ ] All **four** dashboard sections are present in the correct vertical order.
- [ ] Layout matches the approved dark-mode mockup while keeping existing actual behavior.
- [ ] Theme toggle works in dark and light, preserving contrast.
- [ ] PDF picker, drag/drop, explicit `Upload & Index`, and status handling work.
- [ ] Documents show real metadata, real active status, and correct targeted deletion.
- [ ] Activating a document, if supported, updates the generator context reliably.
- [ ] Material search remains optional; real search results and empty/error states are displayed.
- [ ] Generate section passes correct active document, topic, count, and difficulty to existing API.
- [ ] Generation success continues to the existing results presentation; errors are recoverable.
- [ ] Responsive layouts at 375px/768px/1280px are usable with no horizontal overflow.
- [ ] No hardcoded screenshot values, fake progress, dead buttons, or unsupported new endpoints.
- [ ] No regression in upload, indexing, document selection, search, generation, or deletion.

## 11. Visual references and caveats

- **Primary:** `a_detailed_dark_themed_ui_dashboard_mockup_clean.png` — newest complete four-section page.
- **Secondary:** `dasbor_generator_pertanyaan_pdf.png` — first approved upload/document styling direction.
- **Existing UI screenshot:** establishes the real `Aktif` state, separate optional material search, topic/count/difficulty controls, and `Generate Soal dari "..."` document context.

Mockups depict **appearance**, not authoritative system behavior. Where visuals conflict with established functionality (such as automatic indexing instead of an explicit `Upload & Index` action), **preserve established functionality**.

## 12. Liveliness dial (implementation addendum)

This spec doesn't state ENERGY/RHYTHM/MOTION values, so the implementation is recorded here for future additions to calibrate against:

- **ENERGY 2**: Stripe/Vercel-tier polish (gradient CTAs, layered surfaces), not Awwwards-bold and not GOV.UK-flat.
- **RHYTHM 2**: the four sections (Upload, Dokumen Terindeks, Cari materi, Generate Soal) each have a genuinely different internal composition driven by their content, with a few shared conventions (card shell, label style).
- **MOTION 1**: hover/focus-visible transitions only, no loops, no scroll-driven or decorative animation.
