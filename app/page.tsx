"use client";

import { useEffect, useState, useCallback } from "react";
import { UploadForm } from "@/components/UploadForm";
import { DocumentList, type DocumentSummary } from "@/components/DocumentList";
import { SearchPanel } from "@/components/SearchPanel";
import { QuestionList } from "@/components/QuestionList";

interface Question {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
  sources: { page: number; chunk_index?: number | null }[];
}

export default function Home() {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [selected, setSelected] = useState<DocumentSummary | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const [topic, setTopic] = useState("");
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshDocuments = useCallback(async (selectId?: string) => {
    try {
      const res = await fetch("/api/documents");
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Failed to load documents.");
      const docs = data.documents as DocumentSummary[];
      setDocuments(docs);
      if (selectId) {
        setSelected(docs.find((d) => d.document_id === selectId) ?? null);
      } else {
        setSelected((prev) => (prev ? docs.find((d) => d.document_id === prev.document_id) ?? null : null));
      }
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Failed to load documents.");
    }
  }, []);

  useEffect(() => {
    refreshDocuments();
  }, [refreshDocuments]);

  async function handleDelete(documentId: string) {
    try {
      const res = await fetch(`/api/documents/${documentId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail ?? "Delete failed.");
      }
      if (selected?.document_id === documentId) {
        setSelected(null);
        setQuestions([]);
      }
      await refreshDocuments();
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Delete failed.");
    }
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !topic.trim()) return;
    setGenerating(true);
    setError(null);
    setQuestions([]);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_id: selected.document_id,
          topic,
          question_count: questionCount,
          difficulty,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Generate failed.");
      setQuestions(data.questions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generate failed.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10">
      <h1 className="text-2xl font-bold">PDF Question Generator</h1>

      <UploadForm onUploaded={(result) => refreshDocuments(result.document_id)} />

      <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-lg font-semibold">Dokumen Terindex</h2>
        {listError && <p className="text-sm text-red-600">{listError}</p>}
        <DocumentList documents={documents} selectedId={selected?.document_id ?? null} onSelect={setSelected} onDelete={handleDelete} />
      </div>

      {selected && (
        <>
          <SearchPanel documentId={selected.document_id} />

          <form
            onSubmit={handleGenerate}
            className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <h2 className="text-lg font-semibold">Generate Soal dari &quot;{selected.filename}&quot;</h2>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Topik, mis. sistem pernapasan manusia"
              className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              required
            />
            <div className="flex gap-3">
              <label className="flex flex-1 flex-col text-sm">
                Jumlah soal
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                />
              </label>
              <label className="flex flex-1 flex-col text-sm">
                Tingkat kesulitan
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as "easy" | "medium" | "hard")}
                  className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </label>
            </div>
            <button
              type="submit"
              disabled={generating}
              className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
            >
              {generating ? "Membuat soal..." : "Generate"}
            </button>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </form>

          <QuestionList questions={questions} />
        </>
      )}
    </main>
  );
}
