import { NextResponse } from "next/server";
import { GenerateRequestSchema } from "@/lib/schemas";
import { requestedSection } from "@/lib/chunker";
import { embed, GeminiError } from "@/lib/gemini-client";
import { exists, listSections, search } from "@/lib/vector-store";
import { generateQuestions, InvalidGeneration } from "@/lib/generator";
import { config } from "@/lib/config";
import type { RetrievedChunk } from "@/lib/schemas";

export const maxDuration = 60;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = GenerateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ detail: parsed.error.issues }, { status: 422 });
  }
  const { document_id, topic, scope: requestedScopeInput, question_count, difficulty } = parsed.data;

  try {
    if (!(await exists(document_id))) {
      return NextResponse.json({ detail: "Document not found." }, { status: 404 });
    }

    const requestedScope = requestedScopeInput || requestedSection(topic);
    let scope: string | null = null;
    if (requestedScope) {
      const indexedSections = await listSections(document_id);
      if (indexedSections.length) {
        scope = indexedSections.find((s) => s.toLowerCase() === requestedScope.toLowerCase()) ?? null;
        if (!scope) {
          return NextResponse.json(
            { detail: "Requested section was not found in the indexed document. Re-upload the PDF to refresh section indexing." },
            { status: 422 },
          );
        }
      }
    }

    const retrievalQuery = `${scope ?? ""} ${topic}`.trim();
    const [vector] = await embed([retrievalQuery]);

    let chunks: RetrievedChunk[] = scope
      ? await search(document_id, vector, config.topK, scope)
      : await search(document_id, vector, config.topK);

    if (scope && chunks.length === 0) {
      return NextResponse.json({ detail: "Requested section has no searchable content in the indexed document." }, { status: 422 });
    }

    const maxDistance = config.maxRetrievalDistance;
    let filteredChunks = chunks.filter((c) => (c.distance ?? 0) <= maxDistance);
    const minimumChars = Math.min(320, 32 * question_count);
    let contextChars = filteredChunks.reduce((sum, c) => sum + c.content.length, 0);

    if (!scope && contextChars < minimumChars) {
      chunks = await search(document_id, vector, config.topK * 4);
      filteredChunks = chunks;
      contextChars = filteredChunks.reduce((sum, c) => sum + c.content.length, 0);
    }
    chunks = filteredChunks;

    if (chunks.length === 0) {
      return NextResponse.json({ detail: "No relevant source material found for this topic." }, { status: 422 });
    }
    if (contextChars < minimumChars) {
      return NextResponse.json(
        { detail: "Retrieved source material is too short to create the requested number of grounded questions." },
        { status: 422 },
      );
    }

    const questions = await generateQuestions(topic, difficulty, question_count, chunks, scope);

    return NextResponse.json({ document_id, topic, difficulty, questions });
  } catch (err) {
    if (err instanceof GeminiError) {
      return NextResponse.json({ detail: err.message }, { status: 503 });
    }
    if (err instanceof InvalidGeneration) {
      return NextResponse.json({ detail: "LLM returned invalid structured output." }, { status: 502 });
    }
    return NextResponse.json({ detail: "Question generation failed." }, { status: 500 });
  }
}
