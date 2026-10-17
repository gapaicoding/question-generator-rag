import { describe, expect, it } from "vitest";
import { chunkPages, requestedSection } from "../lib/chunker";

describe("chunkPages", () => {
  it("preserves page metadata across multiple pages", () => {
    const pages = [
      { page: 1, text: "Hello world, this is page one." },
      { page: 2, text: "Page two has different content." },
    ];
    const chunks = chunkPages(pages, "doc-1", "file.pdf", 1200, 200);
    expect(chunks.map((c) => c.page)).toEqual([1, 2]);
    expect(chunks.every((c) => c.documentId === "doc-1")).toBe(true);
  });

  it("splits long text on word boundaries with overlap", () => {
    const longText = Array.from({ length: 50 }, (_, i) => `word${i}`).join(" ");
    const chunks = chunkPages([{ page: 1, text: longText }], "doc-1", "file.pdf", 100, 20);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.content.endsWith(" ")).toBe(false);
      expect(chunk.content.startsWith(" ")).toBe(false);
    }
  });

  it("detects section headings and tags chunks", () => {
    const pages = [
      { page: 1, text: "LESSON 3\nIntroductory material about plants." },
      { page: 2, text: "More content still inside the same lesson." },
    ];
    const chunks = chunkPages(pages, "doc-1", "file.pdf", 1200, 200);
    expect(chunks.every((c) => c.section === "Lesson 3")).toBe(true);
  });

  it("rejects an overlap that is not smaller than the chunk size", () => {
    expect(() => chunkPages([{ page: 1, text: "x" }], "doc-1", "file.pdf", 100, 100)).toThrow();
  });
});

describe("requestedSection", () => {
  it("extracts a normalized section label from free text", () => {
    expect(requestedSection("soal untuk bab 3 tentang ekosistem")).toBe("Bab 3");
    expect(requestedSection("questions about chapter iv")).toBe("Chapter IV");
    expect(requestedSection("no section mentioned here")).toBeNull();
  });
});
