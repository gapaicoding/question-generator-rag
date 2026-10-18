"use client";

import { useRef, useState } from "react";
import { FileText, Upload } from "lucide-react";
import { MAX_PDF_BYTES_DEFAULT, formatBytes } from "@/lib/constants";

export interface UploadResult {
  document_id: string;
  filename: string;
  pages: number;
  chunks: number;
  sections: string[];
}

function validatePdf(file: File): string | null {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) return "Hanya file PDF yang diterima.";
  if (file.size > MAX_PDF_BYTES_DEFAULT) return `Ukuran file melebihi batas ${formatBytes(MAX_PDF_BYTES_DEFAULT)}.`;
  return null;
}

export function UploadForm({ onUploaded }: { onUploaded: (result: UploadResult) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function selectFile(candidate: File | undefined) {
    if (!candidate) return;
    const message = validatePdf(candidate);
    setValidationError(message);
    setError(null);
    setFile(message ? null : candidate);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/documents", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Upload gagal.");
      onUploaded(data as UploadResult);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload gagal.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-bg-card p-5">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Upload PDF</h2>
        <p className="text-sm text-text-secondary">Pilih file PDF materi pembelajaran untuk diproses dan diindeks.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            selectFile(e.dataTransfer.files?.[0]);
          }}
          className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
            dragOver ? "border-accent-blue bg-bg-hover" : "border-border bg-bg-raised"
          }`}
        >
          <Upload className="h-6 w-6 text-text-muted" aria-hidden />
          <p className="text-sm font-medium text-text-primary">Drag & drop file PDF di sini</p>
          <p className="text-xs text-text-muted">atau klik untuk memilih file dari perangkat kamu</p>
          <span className="mt-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-primary">
            Pilih File PDF
          </span>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="sr-only"
            onChange={(e) => selectFile(e.target.files?.[0])}
          />
          <p className="text-xs text-text-muted">PDF saja, maks. {formatBytes(MAX_PDF_BYTES_DEFAULT)}</p>
        </div>

        {file && (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-bg-raised px-3 py-2 text-sm">
            <FileText className="h-4 w-4 shrink-0 text-accent-blue" aria-hidden />
            <span className="min-w-0 flex-1 truncate text-text-primary">{file.name}</span>
            <span className="shrink-0 text-text-muted">{formatBytes(file.size)}</span>
          </div>
        )}

        {validationError && <p className="text-sm text-danger" role="alert">{validationError}</p>}

        <button
          type="submit"
          disabled={!file || loading}
          className="btn-gradient flex min-h-11 w-full items-center justify-center rounded-lg px-4 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Mengupload & mengindeks..." : "Upload & Index"}
        </button>

        <div aria-live="polite">{error && <p className="text-sm text-danger">{error}</p>}</div>
      </form>
    </section>
  );
}
