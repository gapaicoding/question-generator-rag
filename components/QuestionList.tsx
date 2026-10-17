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
        <li key={i} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="font-medium">
            {i + 1}. {q.question}
          </p>
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {q.options.map((option, j) => (
              <li
                key={j}
                className={option === q.answer ? "font-semibold text-green-700 dark:text-green-400" : ""}
              >
                {String.fromCharCode(65 + j)}. {option}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{q.explanation}</p>
          <p className="mt-1 text-xs text-zinc-500">
            Sumber: {q.sources.map((s) => `hal. ${s.page}`).join(", ")}
          </p>
        </li>
      ))}
    </ol>
  );
}
