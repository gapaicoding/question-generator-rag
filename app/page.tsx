"use client";

import { useEffect, useState, useCallback } from "react";
import { FileQuestion } from "lucide-react";
import { UploadForm } from "@/components/UploadForm";
import { ThemeToggle } from "@/components/ThemeToggle";
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
  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [selected, setSelected] = useState<DocumentSummary | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const [topic, setTopic] = useState("");
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshDocuments = useCallback(async (selectId?: string) => {
    setLoadingDocuments(true);
    try {
      const res = await fetch("/api/documents");
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Gagal memuat dokumen.");
      const docs = data.documents as DocumentSummary[];
      setDocuments(docs);
      if (selectId) {
        setSelected(docs.find((d) => d.document_id === selectId) ?? null);
      } else {
        setSelected((prev) => (prev ? docs.find((d) => d.document_id === prev.document_id) ?? null : null));
      }
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Gagal memuat dokumen.");
    } finally {
      setLoadingDocuments(false);
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
        throw new Error(data.detail ?? "Gagal menghapus dokumen.");
      }
      if (selected?.document_id === documentId) {
        setSelected(null);
        setQuestions([]);
      }
      await refreshDocuments();
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Gagal menghapus dokumen.");
    }
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !topic.trim() || generating) return;
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
      if (!res.ok) throw new Error(data.detail ?? "Gagal membuat soal.");
      setQuestions(data.questions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat soal.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-[1160px] flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="btn-gradient flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
            <FileQuestion className="h-6 w-6 text-white" aria-hidden />
          </span>
          <div>
            <h1 className="text-2xl font-bold leading-tight text-text-primary sm:text-3xl">PDF Question Generator</h1>
            <p className="text-sm text-text-secondary">Upload dokumen, cari materi, dan generate soal secara otomatis.</p>
          </div>
        </div>
        <ThemeToggle />
      </header>

      <UploadForm onUploaded={(result) => refreshDocuments(result.document_id)} />

      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-bg-card p-5">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Dokumen Terindeks</h2>
        </div>
        <div aria-live="polite">
          {listError && <p className="text-sm text-danger">{listError}</p>}
          {loadingDocuments && <p className="text-sm text-text-secondary">Memuat dokumen...</p>}
        </div>
        {!loadingDocuments && (
          <DocumentList documents={documents} selectedId={selected?.document_id ?? null} onSelect={setSelected} onDelete={handleDelete} />
        )}
      </section>

      {selected && (
        <>
          <SearchPanel documentId={selected.document_id} />

          <form
            onSubmit={handleGenerate}
            className="flex flex-col gap-4 rounded-2xl border border-border bg-bg-card p-5"
          >
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Generate Soal</h2>
              <p className="text-sm text-text-secondary">Buat soal otomatis dari dokumen yang dipilih.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm text-text-secondary">
                Dokumen aktif
                <span className="truncate rounded-lg border border-border bg-bg-raised px-3 py-2 text-text-primary" title={selected.filename}>
                  {selected.filename}
                </span>
              </label>
              <label className="flex flex-col gap-1 text-sm text-text-secondary">
                Topik
                <input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Topik, mis. sistem pernapasan manusia"
                  required
                  className="rounded-lg border border-border bg-bg-raised px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-text-secondary">
                Jumlah soal
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="rounded-lg border border-border bg-bg-raised px-3 py-2 text-text-primary"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-text-secondary">
                Tingkat kesulitan
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as "easy" | "medium" | "hard")}
                  className="rounded-lg border border-border bg-bg-raised px-3 py-2 text-text-primary"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </label>
            </div>

            <button
              type="submit"
              disabled={generating || !topic.trim()}
              className="btn-gradient flex min-h-11 w-full items-center justify-center rounded-lg px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {generating ? "Membuat soal..." : "Generate Soal"}
            </button>

            <div aria-live="polite">{error && <p className="text-sm text-danger">{error}</p>}</div>
          </form>

          <QuestionList questions={questions} />
        </>
      )}
    </main>
  );
}
