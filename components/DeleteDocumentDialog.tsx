"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

const FOCUSABLE_SELECTOR = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

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
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();

    const main = document.querySelector("main");
    main?.setAttribute("inert", "");
    main?.setAttribute("aria-hidden", "true");

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onCancel();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      main?.removeAttribute("inert");
      main?.removeAttribute("aria-hidden");
    };
  }, [onCancel]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        ref={dialogRef}
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
    </div>,
    document.body,
  );
}
