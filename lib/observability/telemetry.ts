import * as Sentry from "@sentry/nextjs";
import { getLangfuse } from "./langfuse";

export interface TraceParams<T> {
  name: string;
  userId?: string;
  sessionId?: string;
  input?: unknown;
  metadata?: Record<string, unknown>;
  fn: (traceId: string) => Promise<T>;
}

/**
 * Wraps any async function in a Langfuse trace.
 * On error: logs to Langfuse output + captures in Sentry, then re-throws.
 */
export async function withTrace<T>(params: TraceParams<T>): Promise<T> {
  const langfuse = getLangfuse();
  const trace = langfuse.trace({
    name: params.name,
    userId: params.userId,
    sessionId: params.sessionId,
    input: params.input ?? null,
    metadata: params.metadata,
  });

  try {
    const result = await params.fn(trace.id);
    trace.update({ output: { ok: true } });
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    trace.update({ output: { ok: false, error: message } });
    Sentry.captureException(err, {
      tags: { traceId: trace.id, scope: params.name },
      extra: params.metadata,
    });
    throw err;
  } finally {
    trace.flushAsync().catch(() => {});
  }
}

/**
 * Spans inside an existing trace — use this for sub-steps
 * e.g. embed, rag-context, db-insert inside a chat.request trace
 */
export function createSpan(traceId: string, spanName: string, input?: unknown) {
  const langfuse = getLangfuse();
  return langfuse.span({ traceId, name: spanName, input: input ?? null });
}

/**
 * Record a full LLM generation inside a trace (model, prompt, completion, usage)
 */
export function recordGeneration(params: {
  traceId: string;
  name: string;
  model: string;
  prompt: unknown;
  completion: unknown;
  usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
}) {
  const langfuse = getLangfuse();
  langfuse.generation({
    traceId: params.traceId,
    name: params.name,
    model: params.model,
    input: params.prompt,
    output: params.completion,
    usage: params.usage
      ? {
          input: params.usage.inputTokens,
          output: params.usage.outputTokens,
          total: params.usage.totalTokens,
          unit: "TOKENS",
        }
      : undefined,
  });
}

/** Fire-and-forget error capture (safe to call anywhere) */
export function captureError(err: unknown, ctx?: Record<string, unknown>): void {
  console.error("[captureError]", err);
  Sentry.captureException(err, { extra: ctx });
}
