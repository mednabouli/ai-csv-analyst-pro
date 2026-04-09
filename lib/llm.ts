import { createGateway } from "@ai-sdk/gateway";
import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { createOllama } from "ollama-ai-provider";

const gateway = createGateway();
const ollama = createOllama({ baseURL: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/api" });

export const PROVIDERS = {
  // Gemma 4 — free via Vercel AI Gateway (recommended default)
  gemma26b:       gateway("google/gemma-4-26b-a4b-it"),
  gemma31b:       gateway("google/gemma-4-31b-it"),
  // Gemma 4 — free via Google AI Studio (same API key as Gemini)
  gemma26b_api:   google("gemma-4-26b-a4b-it"),
  gemma31b_api:   google("gemma-4-31b-it"),
  // Cloud premium
  claude:         anthropic("claude-sonnet-4-5"),
  gpt4o:          openai("gpt-4o"),
  // Gemini
  gemini25:       google("gemini-2.5-flash"),
  // Local Ollama
  gemma_local_2b: ollama("gemma4:e2b"),
  gemma_local_4b: ollama("gemma4:e4b"),
  gemma_local_26b: ollama("gemma4:26b"),
  // Default
  default:        gateway("google/gemma-4-26b-a4b-it"),
} as const;

export type ProviderKey = keyof typeof PROVIDERS;

export const PROVIDER_META: Record<ProviderKey, { label: string; badge: string; tag: string }> = {
  gemma26b:        { label: "Gemma 4 26B",       badge: "Free",    tag: "Recommended" },
  gemma31b:        { label: "Gemma 4 31B",        badge: "Free",    tag: "Best open model" },
  gemma26b_api:    { label: "Gemma 4 26B API",    badge: "Free",    tag: "250 RPD" },
  gemma31b_api:    { label: "Gemma 4 31B API",    badge: "Free",    tag: "256K context" },
  claude:          { label: "Claude Sonnet",       badge: "Paid",    tag: "Best reasoning" },
  gpt4o:           { label: "GPT-4o",              badge: "Paid",    tag: "Multimodal" },
  gemini25:        { label: "Gemini 2.5 Flash",   badge: "Free",    tag: "Fast" },
  gemma_local_2b:  { label: "Gemma 4 E2B (Local)", badge: "Local",  tag: "Fastest" },
  gemma_local_4b:  { label: "Gemma 4 E4B (Local)", badge: "Local",  tag: "Multimodal" },
  gemma_local_26b: { label: "Gemma 4 26B (Local)", badge: "Local",  tag: "Private" },
  default:         { label: "Gemma 4 26B",         badge: "Free",   tag: "Default" },
};
