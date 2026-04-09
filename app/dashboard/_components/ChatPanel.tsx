"use client";
import { useOptimistic, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import type { Message } from "ai";
import { PROVIDER_META, type ProviderKey } from "@/lib/llm";

const PROVIDER_KEYS = Object.keys(PROVIDER_META).filter(k => k !== "default") as ProviderKey[];

interface Props { sessionId: string; }

export function ChatPanel({ sessionId }: Props) {
  const [provider, setProvider] = useState<ProviderKey>("gemma26b");

  const { messages, input, handleInputChange, handleSubmit, status } = useChat({
    api: "/api/chat",
    body: { sessionId, provider },
  });

  const [optimisticMessages, addOptimistic] = useOptimistic(
    messages,
    (state: Message[], newMsg: Message) => [...state, newMsg]
  );

  const formRef = useRef<HTMLFormElement>(null);
  const meta = PROVIDER_META[provider];

  const handleOptimisticSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    addOptimistic({ id: `tmp-${Date.now()}`, role: "user", content: input, createdAt: new Date() } as Message);
    handleSubmit(e);
  };

  return (
    <div className="flex flex-col h-full bg-background rounded-[var(--radius-card)] border shadow-[var(--shadow-card)]">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between gap-4">
        <h2 className="font-semibold shrink-0">Chat with your data</h2>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${meta.badge === "Free" ? "bg-green-100 text-green-700" : meta.badge === "Local" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}>
            {meta.badge}
          </span>
          <select value={provider} onChange={e => setProvider(e.target.value as ProviderKey)}
            className="text-sm border rounded px-2 py-1 bg-background focus:outline-none focus:ring-2 focus:ring-primary">
            {PROVIDER_KEYS.map(k => (
              <option key={k} value={k}>{PROVIDER_META[k].label} — {PROVIDER_META[k].tag}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {optimisticMessages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center mt-8">
            Upload a CSV and ask anything about your data.
          </p>
        )}
        {optimisticMessages.map(m => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <p className={`max-w-[80%] rounded-xl px-4 py-2 text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              {m.content}
            </p>
          </div>
        ))}
        {status === "streaming" && (
          <div className="flex justify-start">
            <p className="bg-muted rounded-xl px-4 py-2 text-sm animate-pulse">Analyzing…</p>
          </div>
        )}
      </div>

      {/* Input */}
      <form ref={formRef} onSubmit={handleOptimisticSubmit} className="p-4 border-t flex gap-2">
        <input value={input} onChange={handleInputChange}
          placeholder={sessionId ? "Ask about your data…" : "Upload a CSV first…"}
          disabled={!sessionId || status === "streaming"}
          className="flex-1 px-4 py-2 rounded border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50" />
        <button type="submit" disabled={!sessionId || status === "streaming" || !input.trim()}
          className="px-4 py-2 rounded-[var(--radius-card)] bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 hover:opacity-90">
          Send
        </button>
      </form>
    </div>
  );
}
