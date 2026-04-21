"use client";
import { useState, useRef, useEffect } from "react";
import { Download, Copy, Check, ChevronDown } from "lucide-react";
import type { Message } from "ai";

interface Props { messages: Message[]; fileName: string }

function toMarkdown(messages: Message[], fileName: string): string {
  const date = new Date().toLocaleDateString("en-CA");
  const lines = [
    `# CSV Analysis — ${fileName}`,
    `_Exported ${date}_`,
    "",
    "---",
    "",
  ];
  for (const m of messages) {
    if (m.role === "user") {
      lines.push(`**You:** ${m.content}`, "");
    } else {
      lines.push(`**Assistant:**`, "", m.content, "");
    }
  }
  return lines.join("\n");
}

function toText(messages: Message[], fileName: string): string {
  const date = new Date().toLocaleDateString("en-CA");
  const lines = [`CSV Analysis — ${fileName}`, `Exported ${date}`, "", "---", ""];
  for (const m of messages) {
    lines.push(m.role === "user" ? `You: ${m.content}` : `Assistant: ${m.content}`, "");
  }
  return lines.join("\n");
}

function downloadFile(content: string, name: string, type: string) {
  const a = document.createElement("a");
  a.href  = URL.createObjectURL(new Blob([content], { type }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function ExportButton({ messages, fileName }: Props) {
  const [open,   setOpen]   = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const base = fileName.replace(/\.csv$/i, "");

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function copyMd() {
    navigator.clipboard.writeText(toMarkdown(messages, fileName)).then(() => {
      setCopied(true);
      setOpen(false);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (!messages.length) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded border text-sm font-medium hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Export analysis options"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Download className="w-3.5 h-3.5" />}
        {copied ? "Copied!" : "Export"}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-52 rounded-lg border bg-popover shadow-lg z-50 py-1 overflow-hidden" role="menu" aria-label="Export options">
          <button
            onClick={copyMd}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Copy as Markdown"
            role="menuitem"
          >
            <Copy className="w-3.5 h-3.5 text-muted-foreground" /> Copy as Markdown
          </button>
          <button
            onClick={() => { downloadFile(toMarkdown(messages, fileName), `${base}.md`, "text/markdown"); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Download Markdown file"
            role="menuitem"
          >
            <Download className="w-3.5 h-3.5 text-muted-foreground" /> Download .md
          </button>
          <button
            onClick={() => { downloadFile(toText(messages, fileName), `${base}.txt`, "text/plain"); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Download text file"
            role="menuitem"
          >
            <Download className="w-3.5 h-3.5 text-muted-foreground" /> Download .txt
          </button>
        </div>
      )}
    </div>
  );
}
