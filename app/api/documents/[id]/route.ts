import { NextResponse } from "next/server";
import { exists, deleteDocument } from "@/lib/vector-store";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    if (!(await exists(id))) {
      return NextResponse.json({ detail: "Document not found." }, { status: 404 });
    }
    await deleteDocument(id);
  } catch {
    return NextResponse.json({ detail: "Document deletion failed." }, { status: 500 });
  }
  return NextResponse.json({ document_id: id, status: "deleted" });
}
