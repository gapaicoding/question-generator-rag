import { pool } from "./db";
import type { Chunk, RetrievedChunk } from "./schemas";

function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

export async function createDocument(documentId: string, filename: string, pages: number): Promise<void> {
  await pool.query("INSERT INTO documents (id, filename, pages) VALUES ($1, $2, $3)", [documentId, filename, pages]);
}

export async function insertChunks(chunks: Chunk[], embeddings: number[][]): Promise<void> {
  if (chunks.length !== embeddings.length) {
    throw new Error("Chunk and embedding counts differ.");
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const batchSize = 100;
    for (let start = 0; start < chunks.length; start += batchSize) {
      const batchChunks = chunks.slice(start, start + batchSize);
      const batchVectors = embeddings.slice(start, start + batchSize);
      for (let i = 0; i < batchChunks.length; i++) {
        const chunk = batchChunks[i];
        const id = `${chunk.documentId}:${chunk.page}:${chunk.chunkIndex}`;
        await client.query(
          `INSERT INTO chunks (id, document_id, page, chunk_index, section, content, embedding)
           VALUES ($1, $2, $3, $4, $5, $6, $7::vector)`,
          [id, chunk.documentId, chunk.page, chunk.chunkIndex, chunk.section, chunk.content, toVectorLiteral(batchVectors[i])],
        );
      }
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export interface DocumentSummary {
  documentId: string;
  filename: string;
  pages: number;
  chunks: number;
  sections: string[];
  createdAt: string;
}

export async function listDocuments(): Promise<DocumentSummary[]> {
  const result = await pool.query(
    `SELECT d.id, d.filename, d.pages, d.created_at,
            COUNT(c.id) AS chunk_count,
            COALESCE(array_agg(DISTINCT c.section) FILTER (WHERE c.section <> ''), '{}') AS sections
     FROM documents d
     LEFT JOIN chunks c ON c.document_id = d.id
     GROUP BY d.id
     ORDER BY d.created_at DESC`,
  );
  return result.rows.map((row) => ({
    documentId: row.id as string,
    filename: row.filename as string,
    pages: row.pages as number,
    chunks: Number(row.chunk_count),
    sections: (row.sections as string[]) ?? [],
    createdAt: (row.created_at as Date).toISOString(),
  }));
}

export async function exists(documentId: string): Promise<boolean> {
  const result = await pool.query("SELECT 1 FROM documents WHERE id = $1 LIMIT 1", [documentId]);
  return (result.rowCount ?? 0) > 0;
}

export async function listSections(documentId: string): Promise<string[]> {
  const result = await pool.query(
    "SELECT DISTINCT section FROM chunks WHERE document_id = $1 AND section <> '' ORDER BY section",
    [documentId],
  );
  return result.rows.map((row) => row.section as string);
}

export async function search(documentId: string, embedding: number[], topK: number, section?: string): Promise<RetrievedChunk[]> {
  const vectorLiteral = toVectorLiteral(embedding);
  const params: unknown[] = [vectorLiteral, documentId];
  let where = "document_id = $2";
  if (section) {
    params.push(section);
    where += ` AND section = $${params.length}`;
  }
  params.push(topK);
  const result = await pool.query(
    `SELECT content, page, chunk_index, section, embedding <=> $1::vector AS distance
     FROM chunks
     WHERE ${where}
     ORDER BY embedding <=> $1::vector
     LIMIT $${params.length}`,
    params,
  );
  return result.rows.map((row) => ({
    content: row.content as string,
    page: row.page as number,
    chunkIndex: row.chunk_index as number,
    section: (row.section as string) ?? "",
    distance: Number(row.distance),
  }));
}

export async function deleteDocument(documentId: string): Promise<void> {
  await pool.query("DELETE FROM documents WHERE id = $1", [documentId]);
}
