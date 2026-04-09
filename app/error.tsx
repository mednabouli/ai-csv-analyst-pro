"use client";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to observability tool here (Sentry etc.)
    console.error("[GlobalError]", error.message, error.digest);
  }, [error]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="text-muted-foreground max-w-sm text-sm">
          {error.message ?? "An unexpected error occurred."}
        </p>
        {error.digest && (
          <p className="text-xs font-mono text-muted-foreground">ID: {error.digest}</p>
        )}
      </div>
      <button onClick={reset}
        className="px-6 py-2.5 rounded-[var(--radius-card)] bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity">
        Try again
      </button>
    </main>
  );
}
