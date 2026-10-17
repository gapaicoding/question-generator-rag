"use client";

import { useState } from "react";

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

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
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
      if (!res.ok) throw new Error(data.detail ?? "Search failed.");
      setResults(data.results);
      setSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-500 p-4">
      <h2 className="text-lg font-semibold">Cari materi (opsional)</h2>
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="mis. sistem pernapasan"
          className="flex-1 rounded border border-zinc-500 px-3 py-2 text-sm dark:bg-zinc-900"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded border border-zinc-500 px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {loading ? "..." : "Cari"}
        </button>
      </form>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {searched && results.length === 0 && !error && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Tidak ada hasil yang cocok dengan pencarian ini.</p>
      )}
      <ul className="flex flex-col gap-2">
        {results.map((r, i) => (
          <li key={i} className="rounded border border-zinc-500 p-2 text-sm">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Halaman {r.page} · jarak {r.distance.toFixed(2)}
              {r.section && ` · ${r.section}`}
            </p>
            <p>{r.content}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
