"use client";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import type { Components } from "react-markdown";

interface Props { content: string }

function CodeBlock({ className, children }: { className?: string; children?: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const lang = /language-(\w+)/.exec(className ?? "")?.[1];
  const code = String(children).replace(/\n$/, "");

  function copy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="relative group my-3 rounded-lg overflow-hidden border bg-[#1e1e2e]">
      {lang && (
        <div className="flex items-center justify-between px-4 py-1.5 bg-[#181825] text-[11px] text-[#cdd6f4]/60">
          <span>{lang}</span>
          <button onClick={copy}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-[#cdd6f4]/80 hover:text-[#cdd6f4]">
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      )}
      <pre className="overflow-x-auto p-4 text-sm">
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}

const components: Components = {
  code({ className, children, ...props }) {
    const isBlock = /language-/.test(className ?? "");
    if (isBlock) return <CodeBlock className={className}>{children}</CodeBlock>;
    return (
      <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-[0.85em] text-foreground" {...props}>
        {children}
      </code>
    );
  },
  table: ({ children }) => (
    <div className="overflow-x-auto my-3">
      <table className="min-w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted/50">{children}</thead>,
  th: ({ children }) => (
    <th className="border px-3 py-2 text-left font-semibold text-foreground">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border px-3 py-2 text-muted-foreground">{children}</td>
  ),
  tr: ({ children }) => <tr className="even:bg-muted/20 hover:bg-muted/30">{children}</tr>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-primary/30 pl-4 my-3 text-muted-foreground italic">
      {children}
    </blockquote>
  ),
  ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 my-2">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 my-2">{children}</ol>,
  h1: ({ children }) => <h1 className="text-xl font-bold mt-4 mb-2">{children}</h1>,
  h2: ({ children }) => <h2 className="text-lg font-semibold mt-3 mb-1.5">{children}</h2>,
  h3: ({ children }) => <h3 className="text-base font-semibold mt-2 mb-1">{children}</h3>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="text-primary underline underline-offset-2 hover:opacity-80">
      {children}
    </a>
  ),
  hr: () => <hr className="my-4 border-border" />,
};

export function MarkdownMessage({ content }: Props) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={components}
      className="prose prose-sm max-w-none dark:prose-invert leading-relaxed"
    >
      {content}
    </ReactMarkdown>
  );
}
