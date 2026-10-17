import { extractText, getDocumentProxy } from "unpdf";

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
  try {
    const doc = await getDocumentProxy(new Uint8Array(data));
    result = await extractText(doc, { mergePages: false });
  } catch {
    throw new InvalidPDF("PDF is corrupted or invalid.");
  }

  const pages: PageText[] = result.text.map((text, i) => ({
    page: i + 1,
    text: (text ?? "").trim(),
  }));

  if (!pages.some((p) => p.text)) {
    throw new InvalidPDF("PDF contains no extractable text.");
  }

  return pages;
}
