import { CheckCircle2 } from "lucide-react";

interface Question {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
  sources: { page: number; chunk_index?: number | null }[];
}

export function QuestionList({ questions }: { questions: Question[] }) {
  if (questions.length === 0) return null;

  return (
    <ol className="flex flex-col gap-4">
      {questions.map((q, i) => (
        <li key={i} className="shadow-card rounded-[22px] border border-border bg-surface p-6">
          <p className="font-semibold text-text-primary">
            {i + 1}. {q.question}
          </p>
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {q.options.map((option, j) => {
              const isAnswer = option === q.answer;
              return (
                <li
                  key={j}
                  className={`flex items-center gap-1.5 ${isAnswer ? "font-semibold text-success-text" : "text-text-primary"}`}
                >
                  {isAnswer && <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />}
                  {String.fromCharCode(65 + j)}. {option}
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-sm text-text-secondary">{q.explanation}</p>
          <p className="mt-1 text-xs text-text-muted">
            Sumber: {q.sources.map((s) => `hal. ${s.page}`).join(", ")}
          </p>
        </li>
      ))}
    </ol>
  );
}
