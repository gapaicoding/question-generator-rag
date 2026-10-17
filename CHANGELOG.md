# Changelog

All notable changes to this project are documented here.

## [Unreleased] - 2026-10-17

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
