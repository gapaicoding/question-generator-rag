import { PDFParse } from "pdf-parse";

export class InvalidPDF extends Error {}

export interface PageText {
  page: number;
  text: string;
}

export async function extractPages(data: Buffer): Promise<PageText[]> {
  if (!data || data.length === 0) {
    throw new InvalidPDF("PDF is empty.");
  }

  let result;
  const parser = new PDFParse({ data });
  try {
    result = await parser.getText();
  } catch (err) {
    console.error("pdf-parse getText failed:", err);
    throw new InvalidPDF("PDF is corrupted or invalid.");
  } finally {
    await parser.destroy();
  }

  const pages: PageText[] = result.pages.map((p) => ({
    page: p.num,
    text: (p.text ?? "").trim(),
  }));

  if (!pages.some((p) => p.text)) {
    throw new InvalidPDF("PDF contains no extractable text.");
  }

  return pages;
}
