import { MAX_PDF_BYTES_DEFAULT } from "./constants";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  geminiApiKey: required("GEMINI_API_KEY"),
  databaseUrl: required("DATABASE_URL"),
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-3.8-flash",
  geminiEmbedModel: process.env.GEMINI_EMBED_MODEL ?? "gemini-embedding-001",
  geminiEmbedDimensions: Number(process.env.GEMINI_EMBED_DIMENSIONS ?? 768),
  chunkSize: Number(process.env.DEFAULT_CHUNK_SIZE ?? 1200),
  chunkOverlap: Number(process.env.DEFAULT_CHUNK_OVERLAP ?? 200),
  topK: Number(process.env.DEFAULT_TOP_K ?? 5),
  maxRetrievalDistance: Number(process.env.MAX_RETRIEVAL_DISTANCE ?? 1.2),
  maxPdfBytes: Number(process.env.MAX_PDF_BYTES ?? MAX_PDF_BYTES_DEFAULT),
};
