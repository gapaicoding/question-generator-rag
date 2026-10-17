import { NextResponse } from "next/server";
import { SearchRequestSchema } from "@/lib/schemas";
import { embed, GeminiError } from "@/lib/gemini-client";
import { exists, search } from "@/lib/vector-store";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = SearchRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ detail: parsed.error.issues }, { status: 422 });
  }
  const { document_id, query, top_k } = parsed.data;

  try {
    if (!(await exists(document_id))) {
      return NextResponse.json({ detail: "Document not found." }, { status: 404 });
    }
    const [vector] = await embed([query]);
    const results = await search(document_id, vector, top_k);
    return NextResponse.json({
      query,
      results: results.map((r) => ({
        content: r.content,
        page: r.page,
        chunk_index: r.chunkIndex,
        distance: r.distance,
        section: r.section,
      })),
    });
  } catch (err) {
    if (err instanceof GeminiError) {
      return NextResponse.json({ detail: err.message }, { status: 503 });
    }
    return NextResponse.json({ detail: "Document search failed." }, { status: 500 });
  }
}
