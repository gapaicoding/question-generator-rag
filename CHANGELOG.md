# Changelog

All notable changes to this project are documented here.

## [Unreleased] - 2026-10-17

### Added

- Streamlit interface for uploading PDF materials, searching document content, generating multiple-choice questions, and viewing answer explanations with page references.
- API lifecycle tests covering upload, search, generation, deletion, scanned PDFs, Ollama failures, and invalid generated output.
- Windows setup guidance for PowerShell execution policies and running the virtual environment without activation.

### Changed

- Improved UI status and error messages for unavailable services, missing Ollama models, scanned PDFs, and searches without relevant material.
- Added visible progress steps and persistent completion/error states for PDF upload/indexing, search, generation, and document deletion.
- Expanded recovery guidance for corrupted or oversized PDFs, unsupported formats, Ollama timeouts, and invalid generated output.
- Set the Streamlit upload limit to match the API limit of 25 MB.
- Moved pytest's temporary directory to `.pytest_tmp_e2e` to avoid Windows cleanup permission errors.

### Verification

- `python -m pytest -q`: 8 passed.
- Playwright UI flow: PDF upload/indexing, search, question generation, answer/source display, and test document cleanup passed.
