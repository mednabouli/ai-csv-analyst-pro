
"use client";
import { useActionState, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

type State = { error?: string; success?: boolean } | null;

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const token = params.get("token");
  const router = useRouter();
  const [showPass, setShowPass] = useState(false);

  const [state, action, isPending] = useActionState<State, FormData>(
    async (_prev, formData) => {
      const password = formData.get("password") as string;
      const confirm = formData.get("confirm") as string;
      if (!token) return { error: "Invalid or missing reset token. Request a new link." };
      if (password !== confirm) return { error: "Passwords do not match" };
      if (password.length < 8) return { error: "Password must be at least 8 characters" };
      const { error } = await authClient.resetPassword({ newPassword: password, token });
      if (error) return { error: error.message ?? "Password reset failed" };
      return { success: true };
    },
    null
  );

  if (state?.success) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <div className="w-full max-w-sm text-center space-y-4 p-8 rounded-[var(--radius-card)] border shadow-[var(--shadow-card)]">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold">Password updated!</h2>
          <p className="text-sm text-muted-foreground">Your password has been changed successfully.</p>
          <button
            onClick={() => router.push("/login")}
            className="w-full py-2 rounded-[var(--radius-card)] bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Sign in with new password"
          >
            Sign in with new password
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-6 p-8 rounded-[var(--radius-card)] border shadow-[var(--shadow-card)]">
        <div>
          <h1 className="text-2xl font-bold">Reset password</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enter your new password below.
          </p>
        </div>
        <form action={action} className="space-y-4" aria-label="Reset password form">
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium">New password</label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPass ? "text" : "password"}
                placeholder="Min. 8 characters"
                required
                minLength={8}
                className="w-full px-4 py-2 pr-10 rounded border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                aria-required="true"
                aria-label="New password"
                autoComplete="new-password"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPass ? "Hide password" : "Show password"}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {showPass
                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268-2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    : <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268-2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
                  }
                </svg>
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="confirm" className="text-sm font-medium">Confirm new password</label>
            <input
              id="confirm"
              name="confirm"
              type={showPass ? "text" : "password"}
              placeholder="Repeat password"
              required
              className="w-full px-4 py-2 rounded border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              aria-required="true"
              aria-label="Confirm new password"
              autoComplete="new-password"
            />
          </div>
          {state?.error && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded px-3 py-2" role="alert">
              {state.error}
            </p>
          )}
          <button
            type="submit"
            disabled={isPending}
            className="w-full py-2 rounded-[var(--radius-card)] bg-primary text-primary-foreground font-medium disabled:opacity-50 hover:opacity-90"
            aria-label="Reset password"
          >
            {isPending ? "Updating password…" : "Update password"}
          </button>
        </form>
      </div>
    </main>
  );
}
