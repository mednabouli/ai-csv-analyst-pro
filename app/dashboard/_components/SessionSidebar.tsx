"use client";
import { useState, useTransition, useRef, useEffect } from "react";
import { Plus, Trash2, Pencil, Check, X, FileSpreadsheet, ChevronLeft } from "lucide-react";
import { renameSessionAction, deleteSessionAction } from "@/app/actions/sessions";
import type { SessionRow } from "@/app/actions/sessions";

interface Props {
  sessions: SessionRow[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onNew: () => void;
}

function groupByDate(sessions: SessionRow[]) {
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yday  = new Date(today); yday.setDate(today.getDate() - 1);
  const week  = new Date(today); week.setDate(today.getDate() - 7);
  const groups: Record<string, SessionRow[]> = { Today: [], Yesterday: [], "This week": [], Older: [] };
  for (const s of sessions) {
    const d = new Date(s.createdAt);
    if (d >= today)       groups["Today"].push(s);
    else if (d >= yday)   groups["Yesterday"].push(s);
    else if (d >= week)   groups["This week"].push(s);
    else                  groups["Older"].push(s);
  }
  return groups;
}

function fmtBytes(b: number) {
  if (b < 1024)        return `${b} B`;
  if (b < 1024 ** 2)   return `${(b/1024).toFixed(0)} KB`;
  return `${(b/1024**2).toFixed(1)} MB`;
}

function SessionItem({
  session, isActive, onSelect, onDelete, onRename,
}: {
  session: SessionRow; isActive: boolean;
  onSelect: () => void; onDelete: () => void; onRename: (name: string) => void;
}) {
  const [editing, setEditing]   = useState(false);
  const [draft, setDraft]       = useState(session.fileName);
  const [confirm, setConfirm]   = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

  function commitRename() {
    if (draft.trim() && draft !== session.fileName) onRename(draft.trim());
    setEditing(false);
  }

  return (
    <div
      onClick={() => !editing && onSelect()}
      className={`group relative flex items-start gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors
        ${isActive ? "bg-primary/10 text-primary" : "hover:bg-muted/50 text-foreground"}`}
    >
      <FileSpreadsheet className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        {editing ? (
          <input ref={inputRef} value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setEditing(false); }}
            onClick={(e) => e.stopPropagation()}
            className="w-full text-sm bg-background border rounded px-1.5 py-0.5 focus:outline-none focus:ring-2 focus:ring-primary" />
        ) : (
          <p className="text-sm font-medium truncate">{session.fileName}</p>
        )}
        <p className="text-[11px] text-muted-foreground">
          {session.rowCount.toLocaleString()} rows · {fmtBytes(session.sizeBytes)}
        </p>
      </div>

      {editing ? (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <button onClick={commitRename}><Check className="w-3.5 h-3.5 text-green-600" /></button>
          <button onClick={() => setEditing(false)}><X className="w-3.5 h-3.5 text-red-500" /></button>
        </div>
      ) : confirm ? (
        <div className="flex gap-1 items-center" onClick={(e) => e.stopPropagation()}>
          <span className="text-[10px] text-red-500">Delete?</span>
          <button onClick={onDelete}><Check className="w-3.5 h-3.5 text-red-500" /></button>
          <button onClick={() => setConfirm(false)}><X className="w-3.5 h-3.5 text-muted-foreground" /></button>
        </div>
      ) : (
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => setEditing(true)} title="Rename"
            className="p-1 rounded hover:bg-muted">
            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <button onClick={() => setConfirm(true)} title="Delete"
            className="p-1 rounded hover:bg-muted">
            <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      )}
    </div>
  );
}

export function SessionSidebar({ sessions: initial, activeId, onSelect, onDelete, onRename, onNew }: Props) {
  const [sessions, setSessions]   = useState(initial);
  const [collapsed, setCollapsed] = useState(false);
  const [_isPending, startTransition] = useTransition();

  function handleRename(id: string, name: string) {
    setSessions((s) => s.map((x) => (x.id === id ? { ...x, fileName: name } : x)));
    onRename(id, name);
    startTransition(() => renameSessionAction(id, name));
  }

  function handleDelete(id: string) {
    setSessions((s) => s.filter((x) => x.id !== id));
    onDelete(id);
    startTransition(() => deleteSessionAction(id));
  }

  if (collapsed) {
    return (
      <aside className="flex flex-col items-center py-4 w-12 border-r bg-background shrink-0">
        <button onClick={() => setCollapsed(false)} className="p-2 rounded hover:bg-muted" title="Open sidebar">
          <ChevronLeft className="w-4 h-4 rotate-180" />
        </button>
      </aside>
    );
  }

  const groups = groupByDate(sessions);

  return (
    <aside className="flex flex-col w-64 border-r bg-background shrink-0 h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <span className="font-semibold text-sm">Analyses</span>
        <button onClick={() => setCollapsed(true)} className="p-1 rounded hover:bg-muted">
          <ChevronLeft className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div className="px-3 py-2">
        <button onClick={onNew}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors">
          <Plus className="w-4 h-4" /> New analysis
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-3">
        {Object.entries(groups).map(([label, items]) =>
          items.length === 0 ? null : (
            <div key={label}>
              <p className="px-2 py-1 text-[11px] uppercase tracking-wide text-muted-foreground font-medium">{label}</p>
              <div className="space-y-0.5">
                {items.map((s) => (
                  <SessionItem
                    key={s.id}
                    session={s}
                    isActive={s.id === activeId}
                    onSelect={() => onSelect(s.id)}
                    onDelete={() => handleDelete(s.id)}
                    onRename={(name) => handleRename(s.id, name)}
                  />
                ))}
              </div>
            </div>
          )
        )}
        {sessions.length === 0 && (
          <p className="px-3 py-6 text-sm text-center text-muted-foreground">No analyses yet</p>
        )}
      </div>
    </aside>
  );
}
