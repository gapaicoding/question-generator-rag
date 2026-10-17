import type { Chunk } from "./schemas";
import type { PageText } from "./pdf-parser";

const SECTION_HEADING = /^\s*(LESSON|UNIT|BAB|CHAPTER|PELAJARAN)\s+(\d+|[IVXLCDM]+)\b/i;

function pageSection(text: string, current: string | null): string | null {
  for (const line of text.split(/\r\n|\r|\n/)) {
    const match = line.match(SECTION_HEADING);
    if (match) {
      const label = match[1][0].toUpperCase() + match[1].slice(1).toLowerCase();
      const number = match[2];
      const normalizedNumber = /^[0-9]+$/.test(number) ? String(parseInt(number, 10)) : number.toUpperCase();
      current = `${label} ${normalizedNumber}`;
    }
  }
  return current;
}

function rfind(text: string, ch: string, start: number, end: number): number {
  const idx = text.lastIndexOf(ch, end - 1);
  return idx >= start ? idx : -1;
}

export function chunkPages(pages: PageText[], documentId: string, filename: string, size: number, overlap: number): Chunk[] {
  if (size <= 0 || overlap < 0 || overlap >= size) {
    throw new Error("Chunk size must exceed a nonnegative overlap.");
  }

  const chunks: Chunk[] = [];
  let section: string | null = null;

  for (const page of pages) {
    section = pageSection(page.text, section);
    const text = page.text.replace(/\s+/g, " ").trim();

    let start = 0;
    let index = 0;
    while (start < text.length) {
      let end = Math.min(start + size, text.length);
      if (end < text.length) {
        const searchStart = start + Math.floor(size / 2);
        const split = rfind(text, " ", searchStart, end);
        if (split > start) {
          end = split;
        }
      }
      const content = text.slice(start, end).trim();
      if (content) {
        chunks.push({
          documentId,
          filename,
          page: page.page,
          chunkIndex: index,
          section: section ?? "",
          content,
        });
        index += 1;
      }
      if (end === text.length) {
        break;
      }
      let nextStart = Math.max(start + 1, end - overlap);
      while (nextStart > start && text[nextStart - 1] !== " ") {
        nextStart -= 1;
      }
      start = nextStart > start ? nextStart : end;
    }
  }

  return chunks;
}

export function requestedSection(prompt: string): string | null {
  const match = prompt.match(/\b(lesson|unit|bab|chapter|pelajaran)\s+(\d+|[ivxlcdm]+)\b/i);
  if (!match) return null;
  const number = match[2];
  const normalized = /^[0-9]+$/.test(number) ? String(parseInt(number, 10)) : number.toUpperCase();
  const label = match[1][0].toUpperCase() + match[1].slice(1).toLowerCase();
  return `${label} ${normalized}`;
}
