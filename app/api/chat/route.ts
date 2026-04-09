import { streamText, createDataStreamResponse } from "ai";
import { PROVIDERS, type ProviderKey } from "@/lib/llm";
import { buildRAGContext } from "@/lib/rag/strategy";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { chatMessages } from "@/lib/db/schema";
import { checkQueryLimit, incrementUsage } from "@/lib/billing";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { messages, sessionId, provider = "gemma26b" } = await req.json();
  if (!sessionId) return new Response("Missing sessionId", { status: 400 });

  // Billing check
  const limitCheck = await checkQueryLimit(session.user.id, provider);
  if (!limitCheck.allowed) {
    return Response.json(
      { error: limitCheck.reason, upgradeRequired: true, upgrade: limitCheck.upgrade },
      { status: 402 }
    );
  }

  const userMessage = messages.at(-1)?.content ?? "";
  const model = PROVIDERS[provider as ProviderKey] ?? PROVIDERS.default;
  const context = await buildRAGContext(sessionId, userMessage, provider);

  return createDataStreamResponse({
    async execute(dataStream) {
      const result = streamText({
        model,
        system: `You are an expert data analyst. The user has uploaded a CSV file.
Answer questions about the data clearly and concisely.
Cite specific numbers, column names, and row values when relevant.
If a question cannot be answered from the data, say so explicitly.

CSV DATA:
${context}`,
        messages,
        maxTokens: 4096,
        async onFinish({ usage }) {
          dataStream.writeMessageAnnotation({ usage, provider, sessionId });
          await Promise.all([
            db.insert(chatMessages).values([
              { sessionId, role: "user", content: userMessage, modelUsed: provider },
              { sessionId, role: "assistant", content: "streamed", modelUsed: provider, tokensUsed: usage.totalTokens },
            ]),
            incrementUsage(session.user.id, "query", usage.totalTokens),
          ]);
        },
      });
      result.mergeIntoDataStream(dataStream);
    },
    onError: (e) => `Error: ${(e as Error).message}`,
  });
}
