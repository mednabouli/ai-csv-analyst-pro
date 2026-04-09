"use client";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

type State = { error?: string; success?: boolean } | null;

export default function SignupPage() {
  const router = useRouter();

  const [state, action, isPending] = useActionState<State, FormData>(
    async (_prev, formData) => {
      const name     = formData.get("name") as string;
      const email    = formData.get("email") as string;
      const password = formData.get("password") as string;
      const confirm  = formData.get("confirm") as string;

      if (password !== confirm) return { error: "Passwords do not match" };
      if (password.length < 8)  return { error: "Password must be at least 8 characters" };

      const { error } = await authClient.signUp.email({
        name,
        email,
        password,
        callbackURL: "/dashboard",
      });

      if (error) return { error: error.message ?? "Sign up failed" };
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
          <h2 className="text-xl font-bold">Check your email</h2>
          <p className="text-sm text-muted-foreground">
            We sent a verification link to your email address. Click it to activate your account.
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
          <h1 className="text-2xl font-bold">Create an account</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Already have one?{" "}
            <Link href="/login" className="text-primary underline underline-offset-4">Sign in</Link>
          </p>
        </div>

        <form action={action} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-sm font-medium">Full name</label>
            <input id="name" name="name" type="text" placeholder="Jane Doe" required
              className="w-full px-4 py-2 rounded border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <input id="email" name="email" type="email" placeholder="jane@example.com" required
              className="w-full px-4 py-2 rounded border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium">Password</label>
            <input id="password" name="password" type="password" placeholder="Min. 8 characters" required minLength={8}
              className="w-full px-4 py-2 rounded border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="confirm" className="text-sm font-medium">Confirm password</label>
            <input id="confirm" name="confirm" type="password" placeholder="Repeat password" required
              className="w-full px-4 py-2 rounded border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>

          {state?.error && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded px-3 py-2">
              {state.error}
            </p>
          )}

          <button type="submit" disabled={isPending}
            className="w-full py-2 rounded-[var(--radius-card)] bg-primary text-primary-foreground font-medium disabled:opacity-50 hover:opacity-90">
            {isPending ? "Creating account…" : "Create account"}
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

        <p className="text-xs text-center text-muted-foreground">
          By creating an account you agree to our{" "}
          <Link href="/terms" className="underline underline-offset-2">Terms</Link> and{" "}
          <Link href="/privacy" className="underline underline-offset-2">Privacy Policy</Link>.
        </p>
      </div>
    </main>
  );
}
