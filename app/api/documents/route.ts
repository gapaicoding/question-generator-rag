import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { extractPages, InvalidPDF } from "@/lib/pdf-parser";
import { chunkPages } from "@/lib/chunker";
import { embed } from "@/lib/gemini-client";
import { GeminiError } from "@/lib/gemini-client";
import { createDocument, insertChunks, deleteDocument, listDocuments } from "@/lib/vector-store";
import type { Chunk } from "@/lib/schemas";

export const maxDuration = 60;

export async function GET() {
  try {
    const documents = await listDocuments();
    return NextResponse.json({
      documents: documents.map((d) => ({
        document_id: d.documentId,
        filename: d.filename,
        pages: d.pages,
        chunks: d.chunks,
        sections: d.sections,
        created_at: d.createdAt,
      })),
    });
  } catch (err) {
    console.error("Failed to list documents:", err);
    return NextResponse.json({ detail: "Failed to load documents." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ detail: "Request must be multipart/form-data." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ detail: "A PDF file is required under the 'file' field." }, { status: 400 });
  }

  const filename = file.name.split(/[\\/]/).pop() ?? "";
  const contentTypeOk = file.type === "application/pdf" || file.type === "application/x-pdf" || file.type === "";
  if (!filename.toLowerCase().endsWith(".pdf") || !contentTypeOk) {
    return NextResponse.json({ detail: "Only PDF files are accepted." }, { status: 415 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const data = Buffer.from(arrayBuffer);

  if (data.length > config.maxPdfBytes) {
    return NextResponse.json({ detail: "PDF exceeds the 25 MB limit." }, { status: 413 });
  }
  if (!data.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
    return NextResponse.json({ detail: "PDF is corrupted or invalid." }, { status: 400 });
  }

  let pages;
  try {
    pages = await extractPages(data);
  } catch (err) {
    if (err instanceof InvalidPDF) {
      return NextResponse.json({ detail: err.message }, { status: 400 });
    }
    throw err;
  }

  const documentId = randomUUID();
  const chunks: Chunk[] = chunkPages(pages, documentId, filename, config.chunkSize, config.chunkOverlap);
  const sections = [...new Set(chunks.map((c) => c.section).filter(Boolean))];

  let documentCreated = false;
  try {
    const vectors: number[][] = [];
    const embedBatchSize = 16;
    for (let start = 0; start < chunks.length; start += embedBatchSize) {
      const batch = chunks.slice(start, start + embedBatchSize).map((c) => c.content);
      vectors.push(...(await embed(batch)));
    }

    await createDocument(documentId, filename, pages.length);
    documentCreated = true;
    await insertChunks(chunks, vectors);
  } catch (err) {
    if (documentCreated) {
      await deleteDocument(documentId).catch(() => undefined);
    }
    if (err instanceof GeminiError) {
      return NextResponse.json({ detail: err.message }, { status: 503 });
    }
    return NextResponse.json({ detail: "Document indexing failed." }, { status: 500 });
  }

  return NextResponse.json({
    document_id: documentId,
    filename,
    pages: pages.length,
    chunks: chunks.length,
    sections,
    status: "indexed",
  });
}
