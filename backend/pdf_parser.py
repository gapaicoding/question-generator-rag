import pymupdf


class InvalidPDF(ValueError):
    pass


def extract_pages(data: bytes) -> list[dict]:
    if not data:
        raise InvalidPDF("PDF is empty.")
    try:
        with pymupdf.open(stream=data, filetype="pdf") as document:
            pages = [{"page": i + 1, "text": page.get_text().strip()} for i, page in enumerate(document)]
    except (pymupdf.FileDataError, RuntimeError, ValueError) as exc:
        raise InvalidPDF("PDF is corrupted or invalid.") from exc
    if not any(page["text"] for page in pages):
        raise InvalidPDF("PDF contains no extractable text.")
    return pages
