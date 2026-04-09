"use client";
import { useActionState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

type State = { error?: string; success?: boolean } | null;

export default function ForgotPasswordPage() {
  const [state, action, isPending] = useActionState<State, FormData>(
    async (_prev, formData) => {
      const email = formData.get("email") as string;
      const { error } = await authClient.forgetPassword({
        email,
        redirectTo: "/reset-password",
      });
      if (error) return { error: error.message ?? "Failed to send reset email" };
      return { success: true };
    },
    null
  );

  if (state?.success) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <div className="w-full max-w-sm text-center space-y-4 p-8 rounded-[var(--radius-card)] border shadow-[var(--shadow-card)]">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold">Check your email</h2>
          <p className="text-sm text-muted-foreground">
            If an account exists for that email, we sent a password reset link.
            It expires in 1 hour.
          </p>
          <Link href="/login" className="text-sm text-primary underline underline-offset-4">
            Back to sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-6 p-8 rounded-[var(--radius-card)] border shadow-[var(--shadow-card)]">
        <div>
          <h1 className="text-2xl font-bold">Forgot password?</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enter your email and we'll send you a reset link.
          </p>
        </div>

        <form action={action} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <input id="email" name="email" type="email" placeholder="jane@example.com" required
              className="w-full px-4 py-2 rounded border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>

          {state?.error && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded px-3 py-2">
              {state.error}
            </p>
          )}

          <button type="submit" disabled={isPending}
            className="w-full py-2 rounded-[var(--radius-card)] bg-primary text-primary-foreground font-medium disabled:opacity-50 hover:opacity-90">
            {isPending ? "Sending reset link…" : "Send reset link"}
          </button>
        </form>

        <p className="text-center text-sm">
          <Link href="/login" className="text-muted-foreground hover:text-foreground transition-colors">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
