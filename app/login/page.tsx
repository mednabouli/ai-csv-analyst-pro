"use client";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useActionState } from "react";

type State = { error?: string } | null;

async function loginAction(_prev: State, formData: FormData): Promise<State> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const { error } = await authClient.signIn.email({ email, password, callbackURL: "/dashboard" });
  if (error) return { error: error.message };
  return null;
}

export default function LoginPage() {
  const [state, action, isPending] = useActionState<State, FormData>(loginAction, null);

  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-6 p-8 rounded-[var(--radius-card)] border shadow-[var(--shadow-card)]">
        <h1 className="text-2xl font-bold">Sign in</h1>
        <form action={action} className="space-y-4">
          <input name="email" type="email" placeholder="Email" required
            className="w-full px-4 py-2 rounded border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          <input name="password" type="password" placeholder="Password" required
            className="w-full px-4 py-2 rounded border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          {state?.error && <p className="text-sm text-red-500">{state.error}</p>}
          <button type="submit" disabled={isPending}
            className="w-full py-2 rounded-[var(--radius-card)] bg-primary text-primary-foreground font-medium disabled:opacity-50">
            {isPending ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <div className="relative">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">or</span></div>
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
