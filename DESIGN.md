# DESIGN.md — PDF Question Generator

> **Version:** 3.0 — Playful × Electric Blue  
> **Status:** UI implementation specification  
> **Reference:** Approved Electric Blue + Light Cream full-page mockup (18 October 2026)  
> **Scope:** Frontend styling, layout, accessibility and interaction states. Preserve existing backend, retrieval/indexing pipeline, API contracts, and business rules.

## 1. Design direction

Build a welcoming but efficient educational AI workspace, combining the warmth and rounded shapes of a **Playful** editorial design with the clarity of a structured SaaS dashboard.

- **Theme:** light by default, warm cream canvas, white elevated cards.
- **Primary accent:** Electric Blue `#0B72F9` (acceptable tonal range `#0B72F9`–`#2563EB`). **No pink or magenta.**
- **Typography:** Inter (fallback: system sans). Use bold italic for the page title and selected section headings, not for form labels or content rows.
- **Visual signature:** friendly blue strokes, large rounded surfaces, restrained decorative doodles, subtle shadows.
- **Information hierarchy:** upload → indexed documents → optional material search → question generation.
- **Operational priorities:** legible dense metadata, easy document selection, explicit active state, obvious primary action, keyboard accessibility.

### Design boundaries

This is an authenticated/workspace-style productivity page, **not** a marketing landing page. The visual mockup uses an oversized hero for personality; production should keep the hero compact enough that the upload affordance and document list are reached quickly. Decorative elements never obscure inputs or replace functional status messages.

## 2. Design tokens

### 2.1 Color palette

| Token | Hex | Purpose |
|---|---|---|
| `--background` | `#F6F2EE` | Warm cream app background |
| `--surface` | `#FFFFFF` | Main cards and input surfaces |
| `--surface-soft` | `#F8FAFC` | Secondary rows and soft panels |
| `--surface-blue` | `#EFF6FF` | Generate section tint and informational highlights |
| `--primary` | `#0B72F9` | Main CTA, upload button, focus accents, key icons |
| `--primary-hover` | `#075ED1` | Hover state |
| `--primary-pressed` | `#064DA9` | Pressed state |
| `--primary-soft` | `#DBEAFE` | Light-blue backgrounds |
| `--text-primary` | `#111827` | Main text |
| `--text-secondary` | `#475569` | Descriptions and metadata |
| `--text-muted` | `#64748B` | Hints, placeholders |
| `--border` | `#E7E2DB` | Warm neutral outlines |
| `--border-input` | `#D8DEE8` | Form controls |
| `--success` | `#16A34A` | Active status only |
| `--success-soft` | `#DCFCE7` | Active badge background |
| `--neutral-status` | `#64748B` | Inactive status |
| `--neutral-status-soft` | `#F1F5F9` | Inactive badge background |
| `--danger` | `#DC2626` | Destructive actions and errors |
| `--danger-soft` | `#FEE2E2` | Destructive feedback |
| `--focus-ring` | `#93C5FD` | Accessible focus outline |

**Color rules:** Electric Blue is the only decorative accent; green, red and gray are permitted **only** for semantic status and error feedback. Do not introduce purple/pink gradients. Ensure contrast is at least WCAG AA (4.5:1 normal text, 3:1 large text/UI components where applicable). White text on the chosen primary button blue must pass contrast; darken the fill as necessary.

### 2.2 Typography

| Role | Desktop | Mobile | Weight / style |
|---|---|---|---|
| Page hero heading | 56–64 px | 34–40 px | 800–900 italic |
| App wordmark | 22–26 px | 18–20 px | 800 italic |
| Section heading | 22–26 px | 20–22 px | 700–800; optional italic |
| Card/document title | 15–16 px | 14–16 px | 650–700 upright |
| Body / inputs | 15–16 px | 15–16 px | 400–500 |
| Metadata / helper | 12–14 px | 12–14 px | 400–500 |
| Button label | 15–16 px | 15–16 px | 600–700 |

Use line-height 1.2 for headings, 1.5–1.6 for body copy. Do not use italic on filenames, form fields, tables or statuses. File names can wrap or truncate with tooltip/title; never overlap actions.

### 2.3 Spacing, radii and elevation

- Base spacing scale: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64` px.
- Main content width: `min(1200px, calc(100% - 48px))` on desktop; 16px gutters on mobile.
- Section spacing: 16–24px between stacked cards, not landing-page-sized 113px gaps.
- Main cards: 22–28px radius; document rows: 12–16px radius; inputs: 10–12px radius; primary buttons: 12–14px radius; badges: pill.
- Main card padding: 24px desktop, 16px mobile.
- Shadow: `0 12px 32px rgba(41, 36, 28, 0.055)`; hover elevation should remain subtle.
- Borders: 1px warm-neutral. Avoid heavy neon glows, strong glassmorphism, and visual noise.
- Minimum clickable targets: 44 × 44px when practical.

### 2.4 Iconography & decoration

Use consistent 1.75–2px stroke icons (Lucide recommended): `file-sparkles`, `upload-cloud`, `database`, `file-text`, `search`, `book-open`, `ellipsis-vertical`, `trash-2`, `info`, `sparkles`, `check-circle-2`, `loader-circle`, `sun`, `moon`.

Place tiny Electric Blue underline/doodle strokes near the hero title or section corners only. Treat all decoration as `aria-hidden`; hide it on small screens or with reduced-motion preferences. No need for 3D mascots.

## 3. Desktop information architecture

```text
┌─────────────────────────────────────────────────────────────────────┐
│ App logo + PDF Question Generator             Theme toggle / user*  │
├─────────────────────────────────────────────────────────────────────┤
│ Compact editorial intro       │  [1] UPLOAD PDF                    │
│ Large italic heading          │  [ Drag & drop PDF                ] │
│ Subtitle / 3 quick benefits   │  [ Pilih File PDF ]                 │
├─────────────────────────────────────────────────────────────────────┤
│ [2] DOKUMEN TERINDEKS                     [Search docs] [Filter*]   │
│  [PDF icon] title / pages / chunks / lessons / date   [Aktif] [...] │
│  [PDF icon] title / pages / chunks / lessons / date [Nonaktif] [...]│
├─────────────────────────────────────────────────────────────────────┤
│ [3] CARI MATERI (OPSIONAL)                                          │
│  [keyword input_________________________________] [Cari]            │
│  [results area, only after search if API supports it]               │
├─────────────────────────────────────────────────────────────────────┤
│ [4] GENERATE SOAL                                                  │
│  [Dokumen selector]             [Topik (opsional)]                  │
│  [Jumlah soal]                 [Tingkat kesulitan]                  │
│  [                        Generate Soal                         ]   │
│  [generation result panel when returned]                            │
└─────────────────────────────────────────────────────────────────────┘
```

`*` Only include user avatar, document filter, detail drawer or extra actions if the existing product has the corresponding functionality. Do not implement decorative, nonfunctional controls merely because they appear in the mockup.

### Layout behavior

- **>= 1024px:** two-column intro/upload, then stacked full-width sections. Intro approximately 42%; upload 58%. The mockup places both in the first row.
- **768–1023px:** use one column for intro/upload unless both remain comfortable. Other sections remain full-width.
- **< 768px:** single-column vertical stack, compact hero, controls full-width, metadata wraps safely, each document row becomes a structured card.
- The overall page scrolls; avoid nested document-list scrolling for a short list.

## 4. Component specifications

### 4.1 Header

- Left: Electric Blue document-with-sparkle icon + *PDF Question Generator* wordmark.
- Right: theme toggle **only if implemented**. Mockup shows `Light mode`; label should communicate current state or toggle destination consistently.
- Keep header light/white with restrained divider or shadow. Sticky is optional; if sticky, do not cover heading anchors or dialogs.
- Do not add an account avatar unless authentication/profile functionality exists.

### 4.2 Intro / hero

- Small supportive annotation: `Ubah materi PDF-mu jadi soal latihan!`
- Hero headline: `PDF Question Generator`, heavy italic, left-aligned on desktop.
- Supporting sentence: `Upload dokumen, cari materi, dan generate soal secara otomatis dari konten PDF.`
- Three optional short benefit indicators: `Otomatis diindeks`, `Pencarian materi cepat`, `Generate soal dengan AI`.
- Decorative blue hand-drawn underline and strokes near headline, never overlapping text.
- Mobile: reduce display size, simplify decorations; allow the heading to wrap to two lines.

### 4.3 Upload PDF

**Structure:** small blue numbered marker `1`, section title, explanation, optional accurate file-limit note, dropzone, `Pilih File PDF` button.

- Dropzone: dotted warm-gray border, soft white surface, upload-cloud icon and instruction: `Drag & drop file PDF di sini`.
- Clicking dropzone or its button opens file chooser (`accept="application/pdf,.pdf"`).
- On selection, show name, size, and an explicit `Upload & Index` action **if the current implementation requires manual submission**. The mockup text suggesting automatic upload must only be used if the app truly auto-uploads after selection.
- Validate client-side PDF type/size; server remains authoritative. **100 MB is visual-reference placeholder, not a verified backend limit**—display only an actual configured limit.
- States: idle, drag-over (blue highlight), selected, uploading (progress if available), indexing, success, error/retry.
- Prevent duplicate submissions during upload/indexing. Announce progress and errors accessibly.
- Never claim indexing succeeded until server confirms it.

### 4.4 Dokumen Terindeks

**Structure:** blue database icon, title, subtitle, optional document-name search, indexed document rows.

Each row shows:

- Red PDF-type icon (semantic file representation, not decorative brand accent).
- Filename, e.g. `E-MODULE PRE A1 STEP 1.pdf_compressed.pdf`.
- Page count and indexed chunk count (`84 halaman`, `84 chunk`).
- Lesson or chapter labels (`Lesson 1` … `Lesson 8`), wrapping neatly.
- Indexed/uploaded timestamp formatted for locale, e.g. `17/10/2026, 15.06.07`.
- `Aktif` / `Nonaktif` status (or status wording matching the existing domain).
- Existing action: `Hapus` with confirmation. Optional `Lihat Detail` or overflow menu only when backed by actual functions.

**Selection/active state:** screenshot references show one document tagged **Aktif**. Treat this as source-of-truth application state, not a new toggle unless an existing activate/select API exists. If generation is driven by the active document, default the form to that document; if multiple-document selection is supported, reflect it faithfully.

**Empty state:** friendly blue document icon + `Belum ada dokumen terindeks` + guidance to upload a PDF.  
**Loading:** skeleton only for dynamic rows/counts, not static headings.  
**Error:** nontechnical message + retry when possible.  
**Deletion:** confirm intent, show pending state, only remove row after confirmed backend success; consider preventing deletion while it is being used for an in-flight operation.

### 4.5 Cari materi (opsional)

- Section icon: blue magnifying glass.
- Title and supporting line: `Tambahkan kata kunci untuk memfokuskan materi dari dokumen.`
- Input placeholder: `mis. sistem pernapasan`.
- Right-side `Cari` button (blue) on desktop; full width or stacked on mobile.
- Submit on button or Enter; trim whitespace; disable empty searches if the backend requires a query.
- Preserve typed query across results. Show `Mencari...`, found matches (with page/lesson/snippet if returned), no-results, and error states.
- Do not fabricate excerpts, similarity percentages, citation pages, or filter controls absent from the API.
- **Important:** this search is optional. It must not prevent question generation when empty unless existing business logic says otherwise.

### 4.6 Generate Soal

- Section surface: subtle light-blue `#EFF6FF` tint or near-white with blue header icon; no pink wash.
- Blue file/sparkles icon, heading `Generate Soal`, short description, informational helper panel.
- Two-column grid on desktop, one-column on mobile:
  1. **Dokumen** — dropdown if multiple selectable indexed documents are supported; otherwise display active document as read-only.
  2. **Topik (opsional)** — text input with placeholder `Topik, mis. sistem pernapasan manusia`.
  3. **Jumlah soal** — numeric input, initial example `5`; enforce existing backend min/max (do not invent limits).
  4. **Tingkat kesulitan** — select using API-defined values; mockup shows `Medium` (other options must match existing backend enums).
- CTA `Generate Soal`, full-width solid Electric Blue with a sparkle icon and white accessible text.
- During generation: disabled submit, spinner plus `Sedang membuat soal...`, maintain form values.
- On success: show the **actual returned** question/result content in an accessible result panel below the form. Preserve current app result format, answer keys and export capabilities if they already exist; do not assume any unimplemented features.
- On failure: clear recoverable message and retry, without losing user input.
- If there is no valid document: disable generation and explain why.

## 5. Interaction model

```text
Upload PDF → file validation → upload → server-side index → document list refresh
                                                       ↓
                              active/selected indexed document
                                                       ↓
                 optional material search / optional topic
                                                       ↓
             question count + difficulty → Generate Soal
                                                       ↓
                   loading → success results / error
```

**Source of truth:** keep all persisted statuses, documents, indexing completion and generated output synchronized with the backend. Never fake state changes to make the UI look complete.

### UI state matrix

| Component | Idle | Loading | Success | Empty / error |
|---|---|---|---|---|
| Upload | Dropzone + picker | Upload/index progress | Confirmed indexed PDF | Validation/retry feedback |
| Indexed documents | Rows + controls | Row skeletons | Accurate metadata/status | Empty instruction/error |
| Material search | Editable input | Searching button state | API-backed snippets | No matches/error |
| Generate | Editable form | Generating state | Results section | Missing document/API failure |

## 6. Accessibility & responsive standards

- All fields have visible `<label>` elements; placeholders are not labels.
- Keyboard focus visible (`2–3px` Electric Blue focus ring, sufficient offset); support keyboard file-picker, dropdowns and confirmation dialogs.
- Dropzone should have a usable file input; drag/drop is a progressive enhancement, not the only upload method.
- No color-only differentiation: status badges include `Aktif` / `Nonaktif` text.
- Announce asynchronous feedback with `aria-live`; dialogs trap focus and return focus on close.
- Disabled states are visually distinct and explain the reason where relevant.
- Respect `prefers-reduced-motion`; decorative arrows can remain static.
- On 320–390px widths, avoid horizontal page scroll and clipped document actions. Keep buttons touch-friendly.
- Font/body sizes should not drop below 14px solely to fit dense document metadata.
- Dark-mode toggle, if present, requires a complete dark theme token set rather than automatic CSS inversion. Light cream is the approved default.

## 7. Suggested React component tree

```text
QuestionGeneratorPage
├── AppHeader
│   └── ThemeToggle?                   (only if implemented)
├── IntroUploadGrid
│   ├── IntroHero
│   └── PdfUploadCard
│       ├── PdfDropzone
│       └── UploadProgress
├── IndexedDocumentsCard
│   ├── DocumentSearch?                (optional supported capability)
│   └── DocumentRow[]
│       ├── DocumentMetadata
│       ├── DocumentStatusBadge
│       └── DeleteDocumentDialog
├── MaterialSearchCard
│   └── MaterialSearchResults
└── GenerateQuestionsCard
    ├── DocumentSelection
    ├── TopicInput
    ├── QuestionCountInput
    ├── DifficultySelect
    ├── GenerateButton
    └── GeneratedQuestionsResult
```

Prefer existing component libraries, state management and data-fetching patterns already installed in the repository. Do not add a new UI dependency only to achieve rounded corners or icons if the existing stack can implement them.

## 8. CSS token starter

```css
:root {
  --background: #f6f2ee;
  --surface: #ffffff;
  --surface-soft: #f8fafc;
  --surface-blue: #eff6ff;
  --primary: #0b72f9;
  --primary-hover: #075ed1;
  --primary-pressed: #064da9;
  --primary-soft: #dbeafe;
  --text-primary: #111827;
  --text-secondary: #475569;
  --text-muted: #64748b;
  --border: #e7e2db;
  --border-input: #d8dee8;
  --success: #16a34a;
  --success-soft: #dcfce7;
  --danger: #dc2626;
  --danger-soft: #fee2e2;
  --focus-ring: #93c5fd;
  --radius-card: 24px;
  --radius-row: 14px;
  --radius-input: 12px;
  --shadow-card: 0 12px 32px rgba(41, 36, 28, .055);
  --font-sans: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
```

These values are **implementation approximations from the approved visual mockup**, not pixel-sampled measurements. Prioritize overall visual hierarchy, consistency and accessible behavior over arbitrary pixel matching.

## 9. Implementation phases for Codex

1. **Inventory current frontend:** identify routes, components, CSS/Tailwind conventions, API calls, existing backend-validated input constraints, document active-status behavior, results UI and error states.
2. **Set theme primitives:** add light-cream/Electric-Blue tokens, typography, background, card and button styles; keep old functionality intact.
3. **Implement layout:** header, intro/upload row, document list, optional search, generator and existing result area.
4. **Component polish:** responsive document rows, status badges, upload drag-over/feedback, consistent labels, dialogs, focus states.
5. **Functional regression:** upload, index, list, active-document behavior, delete, material search, generate and results.
6. **Viewport checks:** 1440px, 1024px, 768px, 390px, 320px. Verify no horizontal overflow and no lost actions.
7. **Quality gates:** lint, typecheck, production build and current test suite. Add targeted tests for any changed interaction behavior.

### Codex implementation prompt

> Review `DESIGN.md` and inspect the current frontend in this repository. Implement the approved **PDF Question Generator — Playful × Electric Blue (Light Cream)** redesign with all existing workflow sections: intro/upload, indexed documents, optional material search, question generation and existing generated-results UI. Preserve existing routes, backend/API contracts, PDF validation limits, indexing behavior, active-document rules and business logic. Do not introduce placeholder buttons or new unsupported features simply to match the mockup. Prefer existing React/CSS/Tailwind components and dependencies. Implement responsive desktop/mobile layouts and all loading/empty/error/confirmation states. Run lint/typecheck/build/tests and report exact results plus any missing backend capability needed for elements shown in the mockup.

## 10. Acceptance criteria

- [ ] Whole page uses the warm cream + Electric Blue palette, with **no pink/magenta** UI accent.
- [ ] Hero and upload share a clear desktop first row and stack correctly on mobile.
- [ ] Indexed documents render actual filename, counts, lessons, timestamp and correct active status.
- [ ] Upload, indexing, material search, delete and question generation still work against the same backend.
- [ ] No invented storage limits, difficulty enums, status toggles or detail actions.
- [ ] Search and generation remain usable without optional topic input.
- [ ] Loading, empty, success and error states are present and accurate.
- [ ] Primary button is visually dominant and meets contrast requirements.
- [ ] Keyboard and mobile interactions are usable, no clipped metadata/actions.
- [ ] Responsive widths 320px–1440px verified.
- [ ] Existing generated-result UI is retained and visually integrated.
- [ ] Existing tests, typecheck and production build pass, or failures are documented.

---

**Design intent:** A confident, lively education-AI interface, pairing *editorial Playful composition* with *operational SaaS clarity*. Keep the workflow recognizable; change presentation, not semantics.
