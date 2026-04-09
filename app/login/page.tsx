"use client";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

type State = { error?: string } | null;

export default function LoginPage() {
  const router = useRouter();

  const [state, action, isPending] = useActionState<State, FormData>(
    async (_prev, formData) => {
      const email      = formData.get("email") as string;
      const password   = formData.get("password") as string;
      // FIX: dontRememberMe is the correct better-auth API.
      // Checkbox checked → persistent 30-day session (dontRememberMe: false).
      // Checkbox unchecked → session-scoped cookie, cleared on browser close (dontRememberMe: true).
      const rememberMe = formData.get("rememberMe") === "on";

      const { error } = await authClient.signIn.email({
        email,
        password,
        callbackURL:    "/dashboard",
        rememberMe,
      });

      if (error) {
        if (error.status === 403) return { error: "Please verify your email before signing in." };
        return { error: error.message ?? "Invalid email or password" };
      }
      router.push("/dashboard");
      return null;
    },
    null
  );

  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-6 p-8 rounded-[var(--radius-card)] border shadow-[var(--shadow-card)]">
        <div>
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {"Don't have an account?"}{" "}
            <Link href="/signup" className="text-primary underline underline-offset-4">Sign up</Link>
          </p>
        </div>

        <form action={action} className="space-y-4" aria-label="Sign in form">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="jane@example.com"
              required
              className="w-full px-4 py-2 rounded border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              aria-required="true"
              aria-label="Email address"
              autoComplete="email"
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium">Password</label>
              <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              className="w-full px-4 py-2 rounded border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              aria-required="true"
              aria-label="Password"
              autoComplete="current-password"
            />
          </div>

          <div className="flex items-center gap-2">
            <input id="rememberMe" name="rememberMe" type="checkbox" defaultChecked
              className="h-4 w-4 rounded border accent-primary focus:ring-2 focus:ring-primary" aria-label="Remember me for 30 days" />
            <label htmlFor="rememberMe" className="text-sm text-muted-foreground select-none cursor-pointer">
              Remember me for 30 days
            </label>
          </div>

          {state?.error && (
            <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded px-3 py-2 flex gap-2 items-start" role="alert">
              <span className="flex-1">{state.error}</span>
              {state.error.includes("verify your email") && (
                <Link href="/verify-email" className="underline shrink-0">Resend email</Link>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-2 rounded-[var(--radius-card)] bg-primary text-primary-foreground font-medium disabled:opacity-50 hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Sign in"
          >
            {isPending ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">or</span>
          </div>
        </div>

        <div className="space-y-2">
          <button onClick={() => authClient.signIn.social({ provider: "google", callbackURL: "/dashboard" })}
            className="w-full py-2 rounded border font-medium hover:bg-muted transition-colors text-sm">
            Continue with Google
          </button>
          <button onClick={() => authClient.signIn.social({ provider: "github", callbackURL: "/dashboard" })}
            className="w-full py-2 rounded border font-medium hover:bg-muted transition-colors text-sm">
            Continue with GitHub
          </button>
        </div>
      </div>
    </main>
  );
}
