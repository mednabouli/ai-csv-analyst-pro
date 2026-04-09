"use client";
import { useActionState, useEffect, useState, useTransition } from "react";
import { useChat } from "@ai-sdk/react";
import { uploadCSVAction, type UploadState } from "@/app/actions/upload";
import { getSessionMessagesAction, type SessionRow } from "@/app/actions/sessions";
import { SessionSidebar } from "./SessionSidebar";
import { CSVPreview } from "./CSVPreview";
import { MarkdownMessage } from "./MarkdownMessage";
import { ExportButton } from "./ExportButton";
import { PROVIDER_META } from "@/lib/llm";
import type { User } from "@/lib/auth";
import type { Message } from "ai";
import { Send, Upload, Loader2, Bot } from "lucide-react";

interface Props { user: User; initialSessions: SessionRow[] }

export function DashboardShell({ user, initialSessions }: Props) {
  const [sessions,       setSessions]       = useState<SessionRow[]>(initialSessions);
  const [activeId,       setActiveId]       = useState<string | null>(null);
  const [provider,       setProvider]       = useState("gemma26b");
  const [sidebarSessions, setSidebarSessions] = useState<SessionRow[]>(initialSessions);
  const [_t, start] = useTransition();

  // ── Upload ─────────────────────────────────────────────────────────────────
  const [uploadState, uploadAction, isUploading] = useActionState<UploadState, FormData>(
    uploadCSVAction, null
  );

  useEffect(() => {
    if (!uploadState?.sessionId) return;
    const newSess: SessionRow = {
      id:          uploadState.sessionId,
      fileName:    uploadState.fileName!,
      rowCount:    uploadState.rowCount!,
      columnCount: uploadState.columns?.length ?? 0,
      sizeBytes:   0,
      createdAt:   new Date(),
    };
    setSidebarSessions((prev) => [newSess, ...prev]);
    setActiveId(uploadState.sessionId);
  }, [uploadState?.sessionId]);

  // ── Chat ───────────────────────────────────────────────────────────────────
  const { messages, input, handleInputChange, handleSubmit, setMessages, isLoading, stop } =
    useChat({
      api: "/api/chat",
      body: { sessionId: activeId, provider },
      onError: console.error,
    });

  async function handleSessionSelect(id: string) {
    stop();
    setActiveId(id);
    start(async () => {
      const msgs = await getSessionMessagesAction(id);
      setMessages(msgs as Message[]);
    });
  }

  function handleNew() {
    stop();
    setActiveId(null);
    setMessages([]);
  }

  const activeSession = sidebarSessions.find((s) => s.id === activeId);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* ── Sidebar ── */}
      <SessionSidebar
        sessions={sidebarSessions}
        activeId={activeId}
        onSelect={handleSessionSelect}
        onDelete={(id) => {
          setSidebarSessions((s) => s.filter((x) => x.id !== id));
          if (activeId === id) handleNew();
        }}
        onRename={(id, name) =>
          setSidebarSessions((s) => s.map((x) => (x.id === id ? { ...x, fileName: name } : x)))
        }
        onNew={handleNew}
      />

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <header className="flex items-center justify-between px-5 py-3 border-b shrink-0 gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Bot className="w-5 h-5 text-primary shrink-0" />
            <span className="font-semibold text-sm truncate">
              {activeSession ? activeSession.fileName : "CSV Analyst Pro"}
            </span>
            {activeSession && (
              <span className="text-xs text-muted-foreground">
                {activeSession.rowCount.toLocaleString()} rows · {activeSession.columnCount} cols
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <select value={provider} onChange={(e) => setProvider(e.target.value)}
              className="text-xs border rounded px-2 py-1 bg-background focus:outline-none focus:ring-2 focus:ring-primary">
              {Object.entries(PROVIDER_META).map(([k, v]) => (
                <option key={k} value={k}>{v.label} ({v.badge})</option>
              ))}
            </select>
            {messages.length > 0 && (
              <ExportButton messages={messages} fileName={activeSession?.fileName ?? "analysis"} />
            )}
          </div>
        </header>

        {/* Content */}
        {!activeId ? (
          <UploadArea action={uploadAction} isUploading={isUploading} uploadState={uploadState} />
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            {/* CSV preview — only on fresh upload */}
            {activeId === uploadState?.sessionId && uploadState?.previewRows && (
              <div className="px-5 pt-4 shrink-0">
                <CSVPreview
                  fileName={uploadState.fileName!}
                  rowCount={uploadState.rowCount!}
                  columns={uploadState.columns!}
                  previewRows={uploadState.previewRows}
                />
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-center py-12">
                  <Bot className="w-10 h-10 text-muted-foreground/40" />
                  <p className="text-muted-foreground text-sm">
                    Ask anything about <strong>{activeSession?.fileName}</strong>
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                    {["What are the column names?", "Show me summary statistics", "Any missing values?"].map((q) => (
                      <button key={q}
                        onClick={() => handleSubmit(undefined, { data: { overrideInput: q } } as never)}
                        className="px-3 py-1.5 rounded-full border text-xs hover:bg-muted transition-colors">
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m) => (
                <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  {m.role === "assistant" && (
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm
                    ${m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted rounded-bl-sm"}`}>
                    {m.role === "assistant"
                      ? <MarkdownMessage content={m.content} />
                      : <p className="whitespace-pre-wrap">{m.content}</p>}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit}
              className="flex gap-2 px-5 py-4 border-t shrink-0 items-end">
              <textarea
                value={input}
                onChange={handleInputChange}
                placeholder="Ask about your data…"
                rows={1}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(e as never); } }}
                className="flex-1 resize-none rounded-xl border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[48px] max-h-[160px] overflow-y-auto"
              />
              <button type="submit" disabled={!input.trim() || isLoading}
                className="h-12 w-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 hover:opacity-90 transition-opacity shrink-0">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

function UploadArea({ action, isUploading, uploadState }: {
  action: (payload: FormData) => void;
  isUploading: boolean;
  uploadState: UploadState;
}) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold">Upload a CSV file</h2>
          <p className="text-sm text-muted-foreground">Drag & drop or click to browse</p>
        </div>
        <form action={action}>
          <label className="flex flex-col items-center gap-4 p-8 border-2 border-dashed rounded-[var(--radius-card)] cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-all group">
            <Upload className="w-10 h-10 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="text-sm text-muted-foreground group-hover:text-foreground">
              {isUploading ? "Uploading…" : "Choose a CSV file"}
            </span>
            <input type="file" name="file" accept=".csv" className="sr-only"
              onChange={(e) => {
                if (e.target.form && e.target.files?.[0]) {
                  const fd = new FormData(e.target.form);
                  action(fd);
                }
              }} />
          </label>
        </form>
        {uploadState?.error && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded px-3 py-2 text-center">
            {uploadState.error}
          </p>
        )}
      </div>
    </div>
  );
}
