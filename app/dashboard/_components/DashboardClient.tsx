"use client";
import { useState } from "react";
import { UploadZone } from "./UploadZone";
import { ChatPanel } from "./ChatPanel";

export function DashboardClient() {
  const [sessionId, setSessionId] = useState("");
  const [fileName, setFileName] = useState("");

  return (
    <div className="flex-1 grid grid-cols-[380px_1fr] gap-6 p-6 overflow-hidden">
      <div className="flex flex-col gap-4 overflow-y-auto">
        <UploadZone onUpload={(id, name) => { setSessionId(id); setFileName(name); }} />
        {fileName && (
          <div className="p-4 rounded-[var(--radius-card)] border bg-muted/40 text-sm space-y-1">
            <p className="font-medium">Active file</p>
            <p className="text-muted-foreground truncate">{fileName}</p>
            <p className="text-xs text-muted-foreground font-mono">{sessionId.slice(0, 8)}…</p>
          </div>
        )}
      </div>
      <ChatPanel sessionId={sessionId} />
    </div>
  );
}
