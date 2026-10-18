"use client";

import { useEffect, useState, useCallback } from "react";
import { Sparkles } from "lucide-react";
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
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary">
            <Sparkles className="h-5 w-5 text-white" aria-hidden />
          </span>
          <span className="text-xl font-extrabold italic text-text-primary">PDF Question Generator</span>
        </div>
        <ThemeToggle />
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-stretch">
        <div className="flex flex-col justify-center gap-3 lg:col-span-5">
          <p className="text-sm font-medium text-primary-text">Ubah materi PDF-mu jadi soal latihan!</p>
          <h1 className="text-4xl font-extrabold italic leading-[1.1] text-text-primary sm:text-5xl">
            PDF Question Generator
          </h1>
          <p className="text-base text-text-secondary">
            Upload dokumen, cari materi, dan generate soal secara otomatis dari konten PDF.
          </p>
          <ul className="flex flex-wrap gap-2 text-xs font-medium text-primary-text">
            <li className="rounded-full bg-primary-soft px-3 py-1.5">Otomatis diindeks</li>
            <li className="rounded-full bg-primary-soft px-3 py-1.5">Pencarian materi cepat</li>
            <li className="rounded-full bg-primary-soft px-3 py-1.5">Generate soal dengan AI</li>
          </ul>
        </div>
        <div className="lg:col-span-7">
          <UploadForm onUploaded={(result) => refreshDocuments(result.document_id)} />
        </div>
      </div>

      <section className="shadow-card flex flex-col gap-4 rounded-[22px] border border-border bg-surface p-6">
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
            className="shadow-card flex flex-col gap-4 rounded-[22px] border border-border bg-surface-blue p-6"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">4</span>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                <Sparkles className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <h2 className="text-lg font-bold text-text-primary">Generate Soal</h2>
                <p className="text-sm text-text-secondary">Buat soal otomatis dari dokumen yang dipilih.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm text-text-secondary">
                Dokumen aktif
                <span className="truncate rounded-xl border border-border-input bg-surface px-3 py-2 text-text-primary" title={selected.filename}>
                  {selected.filename}
                </span>
              </label>
              <label className="flex flex-col gap-1 text-sm text-text-secondary">
                Topik (opsional)
                <input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Topik, mis. sistem pernapasan manusia"
                  required
                  className="rounded-xl border border-border-input bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
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
                  className="rounded-xl border border-border-input bg-surface px-3 py-2 text-text-primary"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-text-secondary">
                Tingkat kesulitan
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as "easy" | "medium" | "hard")}
                  className="rounded-xl border border-border-input bg-surface px-3 py-2 text-text-primary"
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
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary-solid px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              {generating ? "Sedang membuat soal..." : "Generate Soal"}
            </button>

            <div aria-live="polite">{error && <p className="text-sm text-danger">{error}</p>}</div>
          </form>

          <QuestionList questions={questions} />
        </>
      )}
    </main>
  );
}
