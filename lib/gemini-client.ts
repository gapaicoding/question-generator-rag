import { GoogleGenerativeAI, type Schema } from "@google/generative-ai";
import { config } from "./config";
import { GEMINI_MODEL_IDS } from "./schemas";

export class GeminiError extends Error {}

const client = new GoogleGenerativeAI(config.geminiApiKey);

export async function embed(texts: string[]): Promise<number[][]> {
  const model = config.geminiEmbedModel;
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:batchEmbedContents?key=${config.geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: texts.map((text) => ({
            model: `models/${model}`,
            content: { parts: [{ text }] },
            outputDimensionality: config.geminiEmbedDimensions,
          })),
        }),
      },
    );
    if (!response.ok) {
      const body = await response.text();
      throw new GeminiError(`Gemini embedding request failed: HTTP ${response.status}: ${body.slice(0, 400)}`);
    }
    const data = (await response.json()) as { embeddings?: { values: number[] }[] };
    const vectors = (data.embeddings ?? []).map((e) => e.values);
    if (vectors.length !== texts.length || vectors.some((v) => !v || v.length === 0)) {
      throw new GeminiError("Gemini returned invalid embeddings.");
    }
    return vectors;
  } catch (err) {
    if (err instanceof GeminiError) throw err;
    throw new GeminiError(`Gemini embedding request failed: ${(err as Error).message}`);
  }
}

export async function generateText(prompt: string, responseSchema?: Schema, modelOverride?: string): Promise<string> {
  try {
    const chosenModel = modelOverride && (GEMINI_MODEL_IDS as readonly string[]).includes(modelOverride) ? modelOverride : config.geminiModel;
    const model = client.getGenerativeModel({
      model: chosenModel,
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
        ...(responseSchema ? { responseSchema } : {}),
      },
    });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    if (typeof text !== "string" || text.length === 0) {
      throw new GeminiError("Gemini returned invalid generation output.");
    }
    return text;
  } catch (err) {
    if (err instanceof GeminiError) throw err;
    throw new GeminiError(`Gemini generation request failed: ${(err as Error).message}`);
  }
}
