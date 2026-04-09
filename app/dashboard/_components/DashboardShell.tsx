"use client";
import { useActionState, useEffect, useState, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { useCsrf } from "@/hooks/use-csrf";
import { uploadCSVAction, type UploadState } from "@/app/actions/upload";
import { getSessionMessagesAction, type SessionRow } from "@/app/actions/sessions";
import { SessionSidebar } from "./SessionSidebar";
import { CSVPreview } from "./CSVPreview";
import { MarkdownMessage } from "./MarkdownMessage";
import { ExportButton } from "./ExportButton";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { PROVIDER_META } from "@/lib/llm";
import type { User } from "@/lib/auth";
import type { Message } from "ai";
import { Send, Upload, Loader2, Bot, Menu, X as Close } from "lucide-react";

interface Props {
  user:              User;
  initialSessions:   SessionRow[];
  initialHasMore:    boolean;
  initialNextCursor: Date | null;
}

const SUGGESTION_CHIPS = [
  "What are the column names and types?",
  "Show summary statistics for numeric columns",
  "Are there any missing or null values?",
];

export function DashboardShell({ user: _user, initialSessions, initialHasMore, initialNextCursor }: Props) {
  const toast = useToast();
  const [sidebarOpen,     setSidebarOpen]     = useState(false);
  const [sidebarSessions, setSidebarSessions] = useState<SessionRow[]>(initialSessions);
  const [sidebarHasMore,  _setSidebarHasMore]  = useState(initialHasMore);
  const [sidebarCursor,   _setSidebarCursor]   = useState<Date | null>(initialNextCursor);
  const [activeId,        setActiveId]        = useState<string | null>(null);
  const [provider,        setProvider]        = useState("gemma26b");
  const [formKey,         setFormKey]         = useState(0);
  const { csrfToken, appendCsrf } = useCsrf();

  // ── Upload ─────────────────────────────────────────────────────────────────
  const [uploadState, uploadAction, isUploading] = useActionState<UploadState, FormData>(
    uploadCSVAction, null
  );

  useEffect(() => {
    if (uploadState?.error) {
      toast({ title: "Upload failed", description: uploadState.error, variant: "error" });
      return;
    }
    if (uploadState?.sessionId) {
      const newSess: SessionRow = {
        id:          uploadState.sessionId,
        fileName:    uploadState.fileName!,
        rowCount:    uploadState.rowCount!,
        columnCount: uploadState.columns?.length ?? 0,
        sizeBytes:   0,
        createdAt:   new Date(),
      };
      setSidebarSessions((prev) => [newSess, ...prev]); // eslint-disable-line react-hooks/set-state-in-effect
      setActiveId(uploadState.sessionId);
      setFormKey((k) => k + 1);
      toast({
        title:       "File ready",
        description: `${uploadState.fileName} — ${uploadState.rowCount?.toLocaleString()} rows`,
        variant:     "success",
      });
    }
  }, [uploadState]);

  // ── Chat ───────────────────────────────────────────────────────────────────
  const {
    messages, input, handleInputChange, handleSubmit,
    append,                              // ← FIX 1: use append for chips
    setMessages, isLoading, stop,
  } = useChat({
    api:  "/api/chat",
    body: { sessionId: activeId, provider },
    onError: (e) => toast({ title: "Chat error", description: e.message, variant: "error" }),
  });

  // ── FIX 2: no startTransition wrapper around async work ──────────────────
  // useTransition in React 19 marks the transition as done when the callback
  // returns — it does NOT wait for Promises resolved inside. Wrapping an
  // async function in start() gives false isPending=false mid-fetch.
  // Solution: just await directly; setMessages is a synchronous state update.
  const handleSessionSelect = useCallback(async (id: string) => {
    stop();
    setActiveId(id);
    setSidebarOpen(false);
    const msgs = await getSessionMessagesAction(id);   // await outside any transition
    setMessages(msgs as Message[]);                    // sync React state update
  }, [stop, setMessages]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleNew() {
    stop();
    setActiveId(null);
    setMessages([]);
    setSidebarOpen(false);
  }

  const activeSession = sidebarSessions.find((s) => s.id === activeId);

  return (
    <div className="flex h-screen bg-background overflow-hidden">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — drawer on mobile, static on md+ */}
      <div className={`
        fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0 md:z-auto
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <SessionSidebar
          csrfToken={csrfToken}
          sessions={sidebarSessions}
          hasMore={sidebarHasMore}
          nextCursor={sidebarCursor}
          activeId={activeId}
          onSelect={handleSessionSelect}
          onDelete={(id) => {
            setSidebarSessions((s) => s.filter((x) => x.id !== id));
            if (activeId === id) handleNew();
            toast({ title: "Analysis deleted", variant: "default" });
          }}
          onRename={(id, name) =>
            setSidebarSessions((s) => s.map((x) => (x.id === id ? { ...x, fileName: name } : x)))
          }
          onNew={handleNew}
        />
      </div>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <header className="flex items-center justify-between px-4 py-3 border-b shrink-0 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setSidebarOpen((o) => !o)}
              className="md:hidden p-1.5 rounded-lg hover:bg-muted transition-colors"
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <Close className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <Bot className="w-5 h-5 text-primary shrink-0 hidden md:block" />
            <span className="font-semibold text-sm truncate">
              {activeSession ? activeSession.fileName : "CSV Analyst Pro"}
            </span>
            {activeSession && (
              <span className="text-xs text-muted-foreground hidden sm:block">
                {activeSession.rowCount.toLocaleString()} rows · {activeSession.columnCount} cols
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="hidden sm:block text-xs border rounded px-2 py-1 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {Object.entries(PROVIDER_META).map(([k, v]) => (
                <option key={k} value={k}>{v.label} ({v.badge})</option>
              ))}
            </select>
            {messages.length > 0 && (
              <ExportButton messages={messages} fileName={activeSession?.fileName ?? "analysis"} />
            )}
            <ThemeToggle />
          </div>
        </header>

        {/* Mobile model selector */}
        <div className="sm:hidden px-4 py-2 border-b shrink-0">
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="w-full text-xs border rounded px-2 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {Object.entries(PROVIDER_META).map(([k, v]) => (
              <option key={k} value={k}>{v.label} ({v.badge})</option>
            ))}
          </select>
        </div>

        {/* Body */}
        {!activeId ? (
          <UploadArea key={formKey} action={uploadAction} isUploading={isUploading} appendCsrf={appendCsrf} />
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            {/* CSV preview — only on fresh upload */}
            {activeId === uploadState?.sessionId && uploadState?.previewRows && (
              <div className="px-4 pt-4 shrink-0">
                <CSVPreview
                  fileName={uploadState.fileName!}
                  rowCount={uploadState.rowCount!}
                  columns={uploadState.columns!}
                  previewRows={uploadState.previewRows}
                />
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center gap-4 text-center py-12">
                  <Bot className="w-10 h-10 text-muted-foreground/30" />
                  <div className="space-y-1">
                    <p className="font-medium text-sm">Ready to analyse</p>
                    <p className="text-muted-foreground text-xs">
                      Ask anything about <strong>{activeSession?.fileName}</strong>
                    </p>
                  </div>
                  {/* FIX 1: chips call append() directly — no input manipulation needed */}
                  <div className="flex flex-wrap gap-2 justify-center max-w-sm">
                    {SUGGESTION_CHIPS.map((q) => (
                      <button
                        key={q}
                        onClick={() => append({ role: "user", content: q })}
                        disabled={isLoading}
                        className="px-3 py-1.5 rounded-full border text-xs hover:bg-muted disabled:opacity-40 transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m) => (
                <div key={m.id} className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  {m.role === "assistant" && (
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <div className={`max-w-[85%] sm:max-w-[78%] rounded-2xl px-4 py-3 text-sm
                    ${m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted rounded-bl-sm"}`}
                  >
                    {m.role === "assistant"
                      ? <MarkdownMessage content={m.content} />
                      : <p className="whitespace-pre-wrap">{m.content}</p>}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                    <div className="flex gap-1 items-center h-5">
                      {[0,1,2].map(i => (
                        <span key={i}
                          style={{ animationDelay: `${i * 0.15}s` }}
                          className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <form
              onSubmit={handleSubmit}
              className="flex gap-2 px-4 py-3 border-t shrink-0 items-end bg-background"
            >
              <textarea
                value={input}
                onChange={handleInputChange}
                placeholder="Ask about your data…"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
                  }
                }}
                className="flex-1 resize-none rounded-xl border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[48px] max-h-36 overflow-y-auto"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="h-12 w-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 hover:opacity-90 transition-opacity shrink-0"
              >
                {isLoading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Send className="w-4 h-4" />}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

function UploadArea({ action, isUploading, appendCsrf }: {
  action: (payload: FormData) => void;
  isUploading: boolean;
  appendCsrf: (fd: FormData) => FormData;
}) {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold">Upload a CSV file</h2>
          <p className="text-sm text-muted-foreground">Drag & drop or click to browse</p>
        </div>
        <form action={action}>
          <label className={`flex flex-col items-center gap-4 p-8 border-2 border-dashed rounded-[var(--radius-card)]
            cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-all group
            ${isUploading ? "opacity-60 pointer-events-none" : ""}`}
          >
            {isUploading
              ? <Loader2 className="w-10 h-10 text-primary animate-spin" />
              : <Upload className="w-10 h-10 text-muted-foreground group-hover:text-primary transition-colors" />
            }
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground">
                {isUploading ? "Parsing and indexing…" : "Choose a CSV file"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Max 50 MB · UTF-8 with headers</p>
            </div>
            <input
              type="file"
              name="file"
              accept=".csv"
              className="sr-only"
              onChange={(e) => {
                if (e.target.form && e.target.files?.[0]) {
                  action(appendCsrf(new FormData(e.target.form)));
                }
              }}
            />
          </label>
        </form>
      </div>
    </div>
  );
}
