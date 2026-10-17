import { NextResponse } from "next/server";

async function tryImport(name: string, loader: () => Promise<unknown>) {
  try {
    await loader();
    return { name, ok: true };
  } catch (err) {
    return { name, ok: false, error: err instanceof Error ? `${err.name}: ${err.message}` : String(err) };
  }
}

export async function GET() {
  const results = [
    await tryImport("lib/config", () => import("@/lib/config")),
    await tryImport("lib/db", () => import("@/lib/db")),
    await tryImport("lib/schemas", () => import("@/lib/schemas")),
    await tryImport("lib/pdf-parser", () => import("@/lib/pdf-parser")),
    await tryImport("lib/chunker", () => import("@/lib/chunker")),
    await tryImport("lib/gemini-client", () => import("@/lib/gemini-client")),
    await tryImport("lib/vector-store", () => import("@/lib/vector-store")),
    await tryImport("lib/generator", () => import("@/lib/generator")),
  ];

  let vectorStoreCallOk = true;
  let vectorStoreCallError: string | null = null;
  try {
    const vs = await import("@/lib/vector-store");
    await vs.listDocuments();
  } catch (err) {
    vectorStoreCallOk = false;
    vectorStoreCallError = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  }

  return NextResponse.json({ imports: results, vectorStoreCallOk, vectorStoreCallError });
}
