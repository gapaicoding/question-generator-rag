import { SchemaType, type Schema } from "@google/generative-ai";
import { generateText } from "./gemini-client";
import type { Question, RetrievedChunk } from "./schemas";

export class InvalidGeneration extends Error {}

function normalizeOption(value: string): string {
  const normalized = value.normalize("NFKC").toLowerCase();
  return Array.from(normalized)
    .filter((ch) => /[\p{L}\p{N}]/u.test(ch))
    .join("");
}

function parseJsonObject(raw: string): Record<string, unknown> {
  const clean = raw.trim().replace(/^```(?:json)?\s*|\s*```\s*$/gi, "");
  if (!clean) {
    throw new InvalidGeneration("LLM response was empty (0 characters).");
  }
  let value: unknown;
  try {
    value = JSON.parse(clean);
  } catch {
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    if (start < 0 || end < start) {
      throw new InvalidGeneration(`LLM response did not contain a JSON object (${raw.length} characters).`);
    }
    try {
      value = JSON.parse(clean.slice(start, end + 1));
    } catch {
      throw new InvalidGeneration(`Malformed JSON (${raw.length} characters).`);
    }
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new InvalidGeneration(`LLM JSON root must be an object, received ${Array.isArray(value) ? "array" : typeof value}.`);
  }
  return value as Record<string, unknown>;
}

function generationSchema(count: number): Schema {
  return {
    type: SchemaType.OBJECT,
    properties: {
      questions: {
        type: SchemaType.ARRAY,
        minItems: count,
        maxItems: count,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            question: { type: SchemaType.STRING },
            options: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, minItems: 4, maxItems: 4 },
            answer: { type: SchemaType.STRING },
            explanation: { type: SchemaType.STRING },
            source_ids: { type: SchemaType.ARRAY, items: { type: SchemaType.INTEGER } },
          },
          required: ["question", "options", "answer", "explanation", "source_ids"],
        },
      },
    },
    required: ["questions"],
  };
}

export async function generateQuestions(
  topic: string,
  difficulty: string,
  count: number,
  chunks: RetrievedChunk[],
  scope?: string | null,
  model?: string,
): Promise<Question[]> {
  const labels = new Map<string, RetrievedChunk>();
  chunks.forEach((chunk, i) => labels.set(String(i + 1), chunk));
  const context = chunks
    .map((c, i) => `[Source ${i + 1}, page ${c.page}, chunk ${c.chunkIndex}]\n${c.content}`)
    .join("\n\n");
  const scopeInstruction = scope
    ? `Every question must stay within the selected document section ${scope}. Do not use other sections. `
    : "";

  const difficultyGuide: Record<string, string> = {
    easy: "straightforward recall or recognition questions that test basic understanding of key terms and facts",
    medium: "application or comprehension questions that require understanding relationships between concepts",
    hard: "analysis or evaluation questions that require synthesizing multiple concepts or identifying subtle distinctions",
  };

  let prompt =
    "You are an expert educational assessment writer. Your only source of truth is the supplied source material below. " +
    "Do NOT introduce facts, definitions, or concepts that are not explicitly stated in the source material. " +
    "Detect the primary language of the source material and write ALL questions, options, and explanations in that same language. " +
    `${scopeInstruction}` +
    `Create exactly ${count} multiple choice questions at ${difficulty} difficulty about: ${topic}.\n\n` +
    `Difficulty guide — ${difficulty}: ${difficultyGuide[difficulty] ?? difficultyGuide.medium}.\n\n` +
    "Rules for each question:\n" +
    "- The question stem must be clear and unambiguous.\n" +
    "- Provide exactly four options (A–D). All four must be plausible; avoid obviously wrong distractors.\n" +
    "- All four options must be roughly equal in length and grammatical form so the correct answer cannot be guessed by length alone.\n" +
    "- Only one option is correct. Copy the correct answer verbatim from the options.\n" +
    "- The explanation must state WHY the correct answer is right and briefly why the main distractor is wrong, citing the source.\n" +
    "- Do not use 'All of the above' or 'None of the above' as options.\n" +
    "- Vary the position of the correct answer across questions (do not always put it in position A or B).\n" +
    "- Each question must include source_ids referencing one or more source numbers from the context below.\n\n" +
    "Return only JSON matching the response schema. No Markdown, no extra keys.\n\n" +
    `Source material:\n${context}`;

  const schema = generationSchema(count);

  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await generateText(prompt, schema, model);
    try {
      const data = parseJsonObject(raw);
      const items = data.questions;
      if (!Array.isArray(items) || items.length !== count) {
        throw new InvalidGeneration("Incorrect question count.");
      }
      const questions: Question[] = [];
      for (const item of items as Record<string, unknown>[]) {
        const ids = item.source_ids;
        if (!Array.isArray(ids) || ids.length === 0 || ids.some((id) => !labels.has(String(id)))) {
          throw new InvalidGeneration("Invalid source references.");
        }
        const uniqueIds = [...new Set(ids as (string | number)[])];
        const sources = uniqueIds.map((id) => {
          const chunk = labels.get(String(id))!;
          return { page: chunk.page, chunk_index: chunk.chunkIndex };
        });

        const options = item.options;
        if (!Array.isArray(options) || options.length !== 4) {
          throw new InvalidGeneration("Options must be four distinct choices.");
        }
        const normalizedOptions = (options as string[]).map(normalizeOption);
        if (new Set(normalizedOptions).size !== 4) {
          throw new InvalidGeneration("Options must be four distinct choices.");
        }
        const normalizedAnswer = normalizeOption(String(item.answer ?? ""));
        const matching = (options as string[]).filter((option) => normalizeOption(option) === normalizedAnswer);
        if (matching.length === 0) {
          throw new InvalidGeneration("The answer must match one of the four options.");
        }

        if (typeof item.question !== "string" || item.question.length === 0) {
          throw new InvalidGeneration("A required JSON field is missing.");
        }
        if (typeof item.explanation !== "string" || item.explanation.length === 0) {
          throw new InvalidGeneration("A required JSON field is missing.");
        }

        questions.push({
          question: item.question,
          options: options as string[],
          answer: matching[0],
          explanation: item.explanation,
          sources,
        });
      }
      return questions;
    } catch (exc) {
      const detail = exc instanceof InvalidGeneration ? exc.message : "Generated fields do not match the expected types or values.";
      if (attempt === 1) {
        throw new InvalidGeneration(`LLM output remained invalid after retry: ${detail}`);
      }
      prompt +=
        `\n\nYour previous output was invalid: ${detail}. Correct this specific issue. ` +
        "For every question, provide exactly four distinct options and copy the correct answer " +
        "verbatim from one of those options. Return the exact requested question count as valid JSON only.";
    }
  }

  throw new InvalidGeneration("LLM returned invalid structured output.");
}
