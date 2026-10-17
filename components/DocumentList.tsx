"use client";

import type { UploadResult } from "./UploadForm";

export interface DocumentSummary extends UploadResult {
  created_at: string;
}

export function DocumentList({
  documents,
  selectedId,
  onSelect,
  onDelete,
}: {
  documents: DocumentSummary[];
  selectedId: string | null;
  onSelect: (doc: DocumentSummary) => void;
  onDelete: (documentId: string) => void;
}) {
  if (documents.length === 0) {
    return <p className="text-sm text-zinc-500">Belum ada dokumen yang diindex.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {documents.map((doc) => {
        const isSelected = doc.document_id === selectedId;
        return (
          <li
            key={doc.document_id}
            className={`flex items-center justify-between gap-3 rounded border p-3 text-sm ${
              isSelected
                ? "border-black bg-zinc-50 dark:border-white dark:bg-zinc-900"
                : "border-zinc-200 dark:border-zinc-800"
            }`}
          >
            <button type="button" onClick={() => onSelect(doc)} className="flex-1 text-left">
              <p className="font-medium">{doc.filename}</p>
              <p className="text-xs text-zinc-500">
                {doc.pages} halaman · {doc.chunks} chunk
                {doc.sections.length > 0 && ` · ${doc.sections.join(", ")}`}
                {" · "}
                {new Date(doc.created_at).toLocaleString("id-ID")}
              </p>
            </button>
            <div className="flex items-center gap-2">
              {isSelected && (
                <span className="rounded-full bg-black px-2 py-0.5 text-xs text-white dark:bg-white dark:text-black">
                  Aktif
                </span>
              )}
              <button
                type="button"
                onClick={() => onDelete(doc.document_id)}
                className="text-xs text-red-600 hover:underline"
              >
                Hapus
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
