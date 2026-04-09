import { Langfuse } from "langfuse";

let _client: Langfuse | null = null;

export function getLangfuse(): Langfuse {
  if (!_client) {
    _client = new Langfuse({
      publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
      secretKey: process.env.LANGFUSE_SECRET_KEY!,
      baseUrl: process.env.LANGFUSE_HOST ?? "https://cloud.langfuse.com",
      environment: process.env.LANGFUSE_ENVIRONMENT ?? process.env.NODE_ENV,
      flushAt: 10,
      flushInterval: 5_000,
    });
    _client.on("error", (e) => console.error("[langfuse]", e));
  }
  return _client;
}

export async function flushLangfuse(): Promise<void> {
  await _client?.flushAsync().catch(() => {});
}
