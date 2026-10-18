"use client";

import { useEffect, useRef } from "react";

export function DeleteDocumentDialog({
  filename,
  pending,
  onConfirm,
  onCancel,
}: {
  filename: string;
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        className="w-full max-w-sm rounded-xl border border-border bg-bg-card p-5"
      >
        <h3 id="delete-dialog-title" className="text-base font-semibold text-text-primary">
          Hapus dokumen?
        </h3>
        <p className="mt-2 text-sm text-text-secondary">
          Ini akan menghapus indeks (chunk dan embedding) untuk <span className="font-medium text-text-primary">{filename}</span>. Tindakan ini tidak bisa dibatalkan.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="min-h-11 rounded-lg border border-border px-4 text-sm font-medium text-text-primary disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            aria-label={`Hapus ${filename}`}
            className="min-h-11 rounded-lg bg-danger-solid px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            {pending ? "Menghapus..." : "Hapus"}
          </button>
        </div>
      </div>
    </div>
  );
}
