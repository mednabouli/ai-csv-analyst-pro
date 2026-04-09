"use client";
import { useState } from "react";
import { ChevronDown, ChevronUp, Table2 } from "lucide-react";

interface Props {
  fileName: string;
  rowCount: number;
  columns: string[];
  previewRows: Record<string, unknown>[];
}

function inferType(col: string, rows: Record<string, unknown>[]): string {
  const vals = rows.map((r) => r[col]).filter((v) => v != null && v !== "");
  if (!vals.length) return "empty";
  if (vals.every((v) => typeof v === "number")) return "number";
  if (vals.every((v) => typeof v === "boolean")) return "bool";
  const dateRe = /^\d{4}-\d{2}-\d{2}/;
  if (vals.every((v) => dateRe.test(String(v)))) return "date";
  return "text";
}

const TYPE_BADGE: Record<string, string> = {
  number: "bg-blue-100 text-blue-700",
  bool:   "bg-purple-100 text-purple-700",
  date:   "bg-green-100 text-green-700",
  text:   "bg-gray-100 text-gray-600",
  empty:  "bg-gray-100 text-gray-400",
};

export function CSVPreview({ fileName, rowCount, columns, previewRows }: Props) {
  const [open, setOpen] = useState(true);
  const hidden = rowCount - previewRows.length;

  return (
    <div className="border rounded-[var(--radius-card)] overflow-hidden shadow-[var(--shadow-card)]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          <Table2 className="w-4 h-4 text-primary" />
          <span className="truncate max-w-[200px]">{fileName}</span>
          <span className="text-muted-foreground font-normal">
            {rowCount.toLocaleString()} rows · {columns.length} cols
          </span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/20">
                {columns.map((col) => {
                  const type = inferType(col, previewRows);
                  return (
                    <th key={col} className="px-3 py-2 text-left font-semibold text-foreground whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span>{col}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${TYPE_BADGE[type]}`}>
                          {type}
                        </span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, i) => (
                <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                  {columns.map((col) => (
                    <td key={col} className="px-3 py-1.5 text-muted-foreground whitespace-nowrap max-w-[200px] truncate">
                      {row[col] == null ? (
                        <span className="italic text-muted-foreground/50">null</span>
                      ) : String(row[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {hidden > 0 && (
            <p className="px-4 py-2 text-xs text-muted-foreground bg-muted/10 border-t">
              + {hidden.toLocaleString()} more rows not shown
            </p>
          )}
        </div>
      )}
    </div>
  );
}
