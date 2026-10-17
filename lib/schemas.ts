import { z } from "zod";

export const DocumentResponseSchema = z.object({
  document_id: z.string(),
  filename: z.string(),
  pages: z.number().int(),
  chunks: z.number().int(),
  sections: z.array(z.string()).default([]),
  status: z.literal("indexed").default("indexed"),
});
export type DocumentResponse = z.infer<typeof DocumentResponseSchema>;

export const SearchRequestSchema = z.object({
  document_id: z.string(),
  query: z.string().min(1),
  top_k: z.number().int().min(1).max(20).default(5),
});
export type SearchRequest = z.infer<typeof SearchRequestSchema>;

export const SearchResultSchema = z.object({
  content: z.string(),
  page: z.number().int(),
  chunk_index: z.number().int(),
  distance: z.number(),
  section: z.string().default(""),
});
export type SearchResult = z.infer<typeof SearchResultSchema>;

export const SearchResponseSchema = z.object({
  query: z.string(),
  results: z.array(SearchResultSchema),
});
export type SearchResponse = z.infer<typeof SearchResponseSchema>;

export const GenerateRequestSchema = z.object({
  document_id: z.string(),
  topic: z.string().min(1).max(500),
  scope: z.string().max(100).nullable().optional(),
  question_count: z.number().int().min(1).max(20).default(5),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  type: z.literal("multiple_choice").default("multiple_choice"),
});
export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;

export const SourceSchema = z.object({
  page: z.number().int(),
  chunk_index: z.number().int().nullable().optional(),
});
export type Source = z.infer<typeof SourceSchema>;

export const QuestionSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string()).length(4),
  answer: z.string().min(1),
  explanation: z.string().min(1),
  sources: z.array(SourceSchema).min(1),
});
export type Question = z.infer<typeof QuestionSchema>;

export const GenerateResponseSchema = z.object({
  document_id: z.string(),
  topic: z.string(),
  difficulty: z.string(),
  questions: z.array(QuestionSchema),
});
export type GenerateResponse = z.infer<typeof GenerateResponseSchema>;

export interface Chunk {
  documentId: string;
  filename: string;
  page: number;
  chunkIndex: number;
  section: string;
  content: string;
}

export interface RetrievedChunk {
  content: string;
  page: number;
  chunkIndex: number;
  section: string;
  distance: number;
}
