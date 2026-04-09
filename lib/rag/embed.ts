import { embed, embedMany } from "ai";
import { openai } from "@ai-sdk/openai";

const embeddingModel = openai.embedding("text-embedding-3-small");

export async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({ model: embeddingModel, value: text });
  return embedding;
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const { embeddings } = await embedMany({ model: embeddingModel, values: texts });
  return embeddings;
}
