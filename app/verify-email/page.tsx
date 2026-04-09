"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import Link from "next/link";

type Status = "verifying" | "success" | "error" | "expired";

export default function VerifyEmailPage() {
  const params   = useSearchParams();
  const router   = useRouter();
  const token    = params.get("token");
  const [status, setStatus] = useState<Status>(token ? "verifying" : "error");
  const [error,  setError]  = useState("");

  useEffect(() => {
    if (!token) return;
    authClient.verifyEmail({ query: { token } })
      .then(({ error }) => {
        if (error) {
          setStatus(error.status === 400 ? "expired" : "error");
          setError(error.message ?? "Verification failed");
        } else {
          setStatus("success");
          setTimeout(() => router.push("/dashboard"), 2500);
        }
      });
  }, [token, router]);

  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-sm text-center space-y-4 p-8 rounded-[var(--radius-card)] border shadow-[var(--shadow-card)]">
        {status === "verifying" && (
          <>
            <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">Verifying your email…</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold">Email verified!</h2>
            <p className="text-sm text-muted-foreground">Redirecting to dashboard…</p>
          </>
        )}
        {(status === "error" || status === "expired") && (
          <>
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold">
              {status === "expired" ? "Link expired" : "Verification failed"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {status === "expired"
                ? "This verification link has expired. Request a new one below."
                : (error || "Something went wrong. Try requesting a new verification email.")}
            </p>
            <ResendVerification />
          </>
        )}
        {!token && (
          <>
            <h2 className="text-xl font-bold">No token provided</h2>
            <p className="text-sm text-muted-foreground">
              Use the link from your verification email.
            </p>
            <Link href="/login" className="text-sm text-primary underline underline-offset-4">
              Back to sign in
            </Link>
          </>
        )}
      </div>
    </main>
  );
}

function ResendVerification() {
  const [email, setEmail] = useState("");
  const [sent,  setSent]  = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await authClient.sendVerificationEmail({ email, callbackURL: "/dashboard" });
    setSent(true);
    setLoading(false);
  }

  if (sent) return <p className="text-sm text-green-600 font-medium">Verification email sent!</p>;

  return (
    <form onSubmit={handleResend} className="space-y-2 pt-2">
      <input type="email" value={email} onChange={e => setEmail(e.target.value)}
        placeholder="Enter your email" required
        className="w-full px-3 py-2 text-sm rounded border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
      <button type="submit" disabled={loading}
        className="w-full py-2 rounded bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
        {loading ? "Sending…" : "Resend verification email"}
      </button>
    </form>
  );
}
