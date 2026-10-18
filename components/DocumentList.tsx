"use client";

import { useMemo, useState } from "react";
import { Database, FileText, Search } from "lucide-react";
import type { UploadResult } from "./UploadForm";
import { DeleteDocumentDialog } from "./DeleteDocumentDialog";

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
  onDelete: (documentId: string) => Promise<void>;
}) {
  const [filter, setFilter] = useState("");
  const [pendingDelete, setPendingDelete] = useState<DocumentSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return documents;
    return documents.filter((d) => d.filename.toLowerCase().includes(q));
  }, [documents, filter]);

  const totalChunks = documents.reduce((sum, d) => sum + d.chunks, 0);

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await onDelete(pendingDelete.document_id);
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="shadow-card flex flex-col gap-4 rounded-[22px] border border-border bg-surface p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">2</span>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
            <Database className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-bold text-text-primary">Dokumen Terindeks</h2>
            <p className="text-sm text-text-secondary">Pilih dokumen aktif untuk pencarian dan pembuatan soal.</p>
          </div>
        </div>
        {documents.length > 0 && (
          <p className="text-xs text-text-muted">
            {documents.length} dokumen &middot; {totalChunks} chunk total
          </p>
        )}
      </div>

      {documents.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl bg-surface-soft py-8 text-center">
          <FileText className="h-6 w-6 text-primary" aria-hidden />
          <p className="text-sm font-medium text-text-primary">Belum ada dokumen terindeks</p>
          <p className="text-xs text-text-muted">Upload PDF di atas untuk mulai mengindeks materi.</p>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter nama file..."
              aria-label="Filter dokumen berdasarkan nama file"
              className="w-full rounded-xl border border-border-input bg-surface-soft py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted"
            />
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-text-secondary">Tidak ada dokumen yang cocok dengan filter &quot;{filter}&quot;.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {filtered.map((doc) => {
                const isSelected = doc.document_id === selectedId;
                return (
                  <li
                    key={doc.document_id}
                    className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
                      isSelected ? "border-primary bg-primary-soft" : "border-border bg-surface-soft"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelect(doc)}
                      aria-pressed={isSelected}
                      className="flex min-w-0 flex-1 items-start gap-3 text-left"
                    >
                      <FileText className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold text-text-primary" title={doc.filename}>
                          {doc.filename}
                        </span>
                        <span className="mt-0.5 block text-xs text-text-secondary">
                          {doc.pages} halaman &middot; {doc.chunks} chunk &middot; {new Date(doc.created_at).toLocaleString("id-ID")}
                        </span>
                        {doc.sections.length > 0 && (
                          <span className="mt-1.5 flex flex-wrap gap-1">
                            {doc.sections.map((section) => (
                              <span
                                key={section}
                                className="rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] text-text-secondary"
                              >
                                {section}
                              </span>
                            ))}
                          </span>
                        )}
                      </span>
                    </button>
                    <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          isSelected ? "bg-success-soft text-success-text" : "bg-neutral-status-soft text-neutral-status"
                        }`}
                      >
                        {isSelected ? "Aktif" : "Nonaktif"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPendingDelete(doc)}
                        aria-label={`Hapus ${doc.filename}`}
                        className="flex min-h-11 min-w-11 items-center justify-center rounded-lg px-2 text-xs font-medium text-danger hover:underline"
                      >
                        Hapus
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {pendingDelete && (
        <DeleteDocumentDialog
          filename={pendingDelete.filename}
          pending={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </section>
  );
}
