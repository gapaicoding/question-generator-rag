"use client";

import { useState } from "react";
import { Search } from "lucide-react";

interface SearchResult {
  content: string;
  page: number;
  chunk_index: number;
  distance: number;
  section: string;
}

export function SearchPanel({ documentId }: { documentId: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_id: documentId, query, top_k: 5 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Pencarian gagal.");
      setResults(data.results);
      setSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pencarian gagal.");
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    runSearch();
  }

  return (
    <section className="shadow-card flex flex-col gap-3 rounded-[22px] border border-border bg-surface p-6">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">3</span>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
          <Search className="h-4 w-4" aria-hidden />
        </span>
        <div>
          <h2 className="text-lg font-bold text-text-primary">Cari materi (opsional)</h2>
          <p className="text-sm text-text-secondary">Tambahkan kata kunci untuk memfokuskan materi dari dokumen.</p>
        </div>
      </div>
      <form onSubmit={handleSearch} className="flex flex-col gap-2 sm:flex-row">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="mis. sistem pernapasan"
          aria-label="Kata kunci pencarian materi"
          className="flex-1 rounded-xl border border-border-input bg-surface-soft px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary-solid px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Search className="h-4 w-4" aria-hidden />
          {loading ? "Mencari..." : "Cari"}
        </button>
      </form>

      <div aria-live="polite" className="flex flex-col gap-3">
        {error && (
          <p className="text-sm text-danger">
            {error}{" "}
            <button type="button" onClick={runSearch} className="font-medium underline">
              Coba lagi
            </button>
          </p>
        )}
        {searched && results.length === 0 && !error && (
          <p className="text-sm text-text-secondary">Materi tidak ditemukan.</p>
        )}
        {results.length > 0 && (
          <ul className="flex flex-col gap-2">
            {results.map((r, i) => (
              <li key={i} className="rounded-xl border border-border bg-surface-soft p-3 text-sm">
                <p className="text-xs text-text-muted">
                  Halaman {r.page} &middot; jarak {r.distance.toFixed(2)}
                  {r.section && ` · ${r.section}`}
                </p>
                <p className="mt-1 text-text-primary">{r.content}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
