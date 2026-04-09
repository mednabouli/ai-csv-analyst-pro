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
    <form action={action} className="space-y-4 p-6 rounded-[var(--radius-card)] border shadow-[var(--shadow-card)]" aria-label="Upload CSV form">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">Upload CSV</h2>
        {/* Onboarding tooltip for first-time users */}
        <span
          tabIndex={0}
          className="ml-2 px-2 py-1 rounded bg-muted text-xs text-muted-foreground border border-muted-foreground/20 focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="Tip: You can drag and drop your CSV file or click to browse. Max size 50MB."
        >
          Tip
        </span>
      </div>
      <label
        className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-primary ${isPending ? "opacity-50" : "hover:border-primary hover:bg-muted/50"}`}
        aria-label="CSV file upload area"
        tabIndex={0}
      >
        <div className="flex flex-col items-center gap-1 text-center px-4">
          <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-sm text-muted-foreground">
            {isPending ? "Processing..." : "Drop CSV or click to browse"}
          </p>
          <p className="text-xs text-muted-foreground">Max 50MB</p>
        </div>
        <input
          type="file"
          name="file"
          accept=".csv"
          disabled={isPending}
          className="hidden"
          aria-label="Select CSV file"
        />
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="w-full py-2 rounded-[var(--radius-card)] bg-primary text-primary-foreground font-medium disabled:opacity-50 transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary"
        aria-label="Upload and analyze CSV"
      >
        {isPending ? "Analyzing..." : "Upload & Analyze"}
      </button>
      {state?.error && <p className="text-sm text-red-500" role="alert">{state.error}</p>}
      {state?.sessionId && (
        <p className="text-sm text-green-600 font-medium" role="status">
          705 {state.fileName} 014 {state.rowCount?.toLocaleString()} rows ready
        </p>
      )}
    </form>
  );
}
