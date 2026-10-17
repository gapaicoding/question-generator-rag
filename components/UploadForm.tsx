"use client";

import { useRef, useState } from "react";

export interface UploadResult {
  document_id: string;
  filename: string;
  pages: number;
  chunks: number;
  sections: string[];
}

export function UploadForm({ onUploaded }: { onUploaded: (result: UploadResult) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/documents", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Upload failed.");
      onUploaded(data as UploadResult);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <h2 className="text-lg font-semibold">1. Upload PDF</h2>
      <input ref={inputRef} type="file" accept="application/pdf" className="text-sm" required />
      <button
        type="submit"
        disabled={loading}
        className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {loading ? "Mengindeks..." : "Upload & Index"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
