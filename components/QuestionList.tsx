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
        <li key={i} className="rounded-2xl border border-border bg-bg-card p-5">
          <p className="font-medium text-text-primary">
            {i + 1}. {q.question}
          </p>
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {q.options.map((option, j) => (
              <li
                key={j}
                className={option === q.answer ? "font-semibold text-accent-green" : "text-text-primary"}
              >
                {String.fromCharCode(65 + j)}. {option}
              </li>
            ))}
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
