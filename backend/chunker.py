import re


SECTION_HEADING = re.compile(
    r"^\s*(LESSON|UNIT|BAB|CHAPTER|PELAJARAN)\s+([0-9]+|[IVXLCDM]+)\b",
    re.IGNORECASE,
)


def _page_section(text: str, current: str | None) -> str | None:
    for line in text.splitlines():
        match = SECTION_HEADING.match(line)
        if match:
            current = f"{match.group(1).title()} {match.group(2).upper() if match.group(2).isalpha() else int(match.group(2))}"
    return current


def chunk_pages(pages: list[dict], document_id: str, filename: str, size: int, overlap: int) -> list[dict]:
    if size <= 0 or overlap < 0 or overlap >= size:
        raise ValueError("Chunk size must exceed a nonnegative overlap.")
    chunks = []
    section = None
    for page in pages:
        section = _page_section(page["text"], section)
        text = re.sub(r"\s+", " ", page["text"]).strip()
        start = index = 0
        while start < len(text):
            end = min(start + size, len(text))
            if end < len(text):
                split = text.rfind(" ", start + size // 2, end)
                if split > start:
                    end = split
            content = text[start:end].strip()
            if content:
                chunks.append({"document_id": document_id, "filename": filename, "page": page["page"], "chunk_index": index, "section": section or "", "content": content})
                index += 1
            if end == len(text):
                break
            next_start = max(start + 1, end - overlap)
            while next_start > start and text[next_start - 1] != " ":
                next_start -= 1
            start = next_start if next_start > start else end
    return chunks
