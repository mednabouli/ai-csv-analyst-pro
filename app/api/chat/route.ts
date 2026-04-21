import { streamText, createDataStreamResponse, type LanguageModelV1 } from "ai";
import * as Sentry from "@sentry/nextjs";
import { PROVIDERS, type ProviderKey } from "@/lib/llm";
import { buildRAGContext } from "@/lib/rag/strategy";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { chatMessages } from "@/lib/db/schema";
import { checkQueryLimit, incrementUsage } from "@/lib/billing";
import { getLangfuse } from "@/lib/observability/langfuse";
import { createSpan, recordGeneration } from "@/lib/observability/telemetry";
import { buildChartSpecTool } from "@/lib/chart-spec";

export const runtime   = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  // ── Auth ────────────────────────────────────────────────────────────────
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return new Response("Invalid JSON", { status: 400 });

  const { messages, sessionId, provider = "gemma26b" } = body as {
    messages: { role: string; content: string }[];
    sessionId?: string;
    provider?: string;
  };

  if (!sessionId)            return new Response("Missing sessionId", { status: 400 });
  if (!messages?.length)     return new Response("Missing messages",  { status: 400 });


  // ── IDOR check: verify sessionId belongs to user ──
  const sessionRow = await db.query.sessions.findMany({
    where: (s, { eq }) => eq(s.id, sessionId),
    columns: {
      userId: true,
      // columns: true, // Uncomment if/when columns are stored in DB
    },
    limit: 1,
  });
  if (!sessionRow.length) {
    return new Response("Session not found", { status: 404 });
  }
  if (sessionRow[0].userId !== session.user.id) {
    return new Response("Forbidden", { status: 403 });
  }

  // ── Fetch columns for this session (stub: replace with actual fetch) ──
  // TODO: Replace with actual columns fetch logic from DB or storage
  // Example: const columns = sessionRow[0].columns || [];
  const columns: string[] = []; // Placeholder, must be replaced
  if (!Array.isArray(columns) || columns.length === 0) {
    return new Response("No columns found for this session", { status: 400 });
  }

  const userMessage = String(messages.at(-1)?.content ?? "");

  // ── Create Langfuse trace MANUALLY — never wrap createDataStreamResponse  ──
  // Reason: withTrace() awaits fn() and closes the trace when fn() returns.
  // But createDataStreamResponse returns a Response immediately — the stream
  // continues writing asynchronously after the fn returns. If we use withTrace,
  // the trace flushes before onFinish fires, logging incomplete generation data.
  // Solution: open trace here, close it inside onFinish (stream completion hook).
  const langfuse = getLangfuse();
  const trace = langfuse.trace({
    name:      "chat.request",
    userId:    session.user.id,
    sessionId,
    input:     { userMessage, provider },
    metadata:  { sessionId, provider },
  });

  // ── Billing check ────────────────────────────────────────────────────────
  const limitCheck = await checkQueryLimit(session.user.id, provider);
  if (!limitCheck.allowed) {
    trace.update({ output: { ok: false, reason: limitCheck.reason } });
    langfuse.flushAsync().catch(() => {});
    return Response.json(
      { error: limitCheck.reason, upgradeRequired: true, upgrade: limitCheck.upgrade, traceId: trace.id },
      { status: 402 }
    );
  }

  // ── RAG context (spanned) ────────────────────────────────────────────────
  const ragSpan = createSpan(trace.id, "rag.context", { sessionId, query: userMessage, provider });
  let context: string;
  try {
    context = await buildRAGContext(sessionId, userMessage, provider);
    ragSpan.end({ output: { contextLength: context.length } });
  } catch (err) {
    ragSpan.end({ output: { error: (err as Error).message } });
    trace.update({ output: { ok: false, error: "rag_failed" } });
    langfuse.flushAsync().catch(() => {});
    Sentry.captureException(err, { tags: { scope: "rag.context", traceId: trace.id } });
    return new Response("Failed to retrieve context", { status: 500 });
  }

  const model = (PROVIDERS[provider as ProviderKey] ?? PROVIDERS.default) as unknown as LanguageModelV1;

  // ── Stream — trace stays OPEN until onFinish ─────────────────────────────
  return createDataStreamResponse({
    async execute(dataStream) {
      const result = streamText({
        model,
        system: `You are an expert data analyst. Answer questions about the uploaded CSV data clearly.
Cite specific numbers, column names, and row values when relevant.
If a question cannot be answered from the data, say so explicitly.

CRITICAL: The only valid columns for this session are: ${columns.length ? columns.join(", ") : "(none)"}.

Chart type selection rules:
- Use 'bar' for categorical x and numeric y
- Use 'line' for time series or ordered x and numeric y
- Use 'pie' for part-to-whole with categorical x and numeric y (sum to 100%)
- Use 'scatter' for two numeric columns

CSV DATA:\n${context}`,
        messages: messages as { role: "user" | "assistant"; content: string }[],
        maxTokens: 4096,
        tools: { chart_spec: buildChartSpecTool(columns) },
        maxSteps: 1,
        async onFinish({ text, usage }) {
          // ── FIX 2: persist actual AI text, not the "streamed" placeholder ──
          try {
            await Promise.all([
              db.insert(chatMessages).values([
                {
                  sessionId,
                  role:       "user",
                  content:    userMessage,
                  modelUsed:  provider,
                },
                {
                  sessionId,
                  role:       "assistant",
                  content:    text,              // ← real completion text
                  modelUsed:  provider,
                  tokensUsed: usage.totalTokens,
                },
              ]),
              incrementUsage(session.user.id, "query", usage.totalTokens),
            ]);
          } catch (dbErr) {
            Sentry.captureException(dbErr, { tags: { scope: "chat.persist", traceId: trace.id } });
          }

          // ── Langfuse generation log ──────────────────────────────────────
          recordGeneration({
            traceId:    trace.id,
            name:       "llm.chat",
            model:      provider,
            prompt:     { system: "csv-analyst", userMessage },
            completion: text,
            usage: {
              inputTokens:  usage.promptTokens,
              outputTokens: usage.completionTokens,
              totalTokens:  usage.totalTokens,
            },
          });

          // ── Close trace NOW (stream is done) ────────────────────────────
          trace.update({ output: { ok: true, tokens: usage.totalTokens } });
          langfuse.flushAsync().catch(() => {});

          dataStream.writeMessageAnnotation({
            usage,
            provider,
            sessionId,
            traceId: trace.id,
          });
        },
      });

      result.mergeIntoDataStream(dataStream);
    },

    onError(err) {
      // Close trace on stream error too
      Sentry.captureException(err, { tags: { scope: "chat.stream", traceId: trace.id } });
      trace.update({ output: { ok: false, error: (err as Error).message } });
      langfuse.flushAsync().catch(() => {});
      return `Error: ${(err as Error).message}`;
    },
  });
}
