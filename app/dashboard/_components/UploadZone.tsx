"use client";
import { useActionState } from "react";
import { uploadCSVAction, type UploadState } from "@/app/actions/upload";

interface Props { onUpload: (sessionId: string, fileName: string) => void; }

export function UploadZone({ onUpload }: Props) {
  const [state, action, isPending] = useActionState<UploadState, FormData>(
    async (prev, fd) => {
      const result = await uploadCSVAction(prev, fd);
      if (result?.sessionId) onUpload(result.sessionId, result.fileName ?? "");
      return result;
    },
    null
  );

  return (
    <form action={action} className="space-y-4 p-6 rounded-[var(--radius-card)] border shadow-[var(--shadow-card)]">
      <h2 className="text-lg font-semibold">Upload CSV</h2>
      <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isPending ? "opacity-50" : "hover:border-primary hover:bg-muted/50"}`}>
        <div className="flex flex-col items-center gap-1 text-center px-4">
          <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-sm text-muted-foreground">
            {isPending ? "Processing..." : "Drop CSV or click to browse"}
          </p>
          <p className="text-xs text-muted-foreground">Max 50MB</p>
        </div>
        <input type="file" name="file" accept=".csv" disabled={isPending} className="hidden" />
      </label>
      <button type="submit" disabled={isPending}
        className="w-full py-2 rounded-[var(--radius-card)] bg-primary text-primary-foreground font-medium disabled:opacity-50 transition-opacity hover:opacity-90">
        {isPending ? "Analyzing..." : "Upload & Analyze"}
      </button>
      {state?.error && <p className="text-sm text-red-500">{state.error}</p>}
      {state?.sessionId && (
        <p className="text-sm text-green-600 font-medium">
          ✅ {state.fileName} — {state.rowCount?.toLocaleString()} rows ready
        </p>
      )}
    </form>
  );
}
