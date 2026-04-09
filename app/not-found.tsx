import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 text-center gap-8">
      <div className="space-y-2">
        <p className="text-8xl font-black text-primary/20 select-none">404</p>
        <h1 className="text-2xl font-bold">Page not found</h1>
        <p className="text-muted-foreground text-sm max-w-sm">
          The page you&#39;re looking for doesn&#39;t exist or has been moved.
        </p>
      </div>
      <div className="flex gap-3 flex-wrap justify-center">
        <Link href="/dashboard"
          className="px-5 py-2 rounded-[var(--radius-card)] bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
          Go to dashboard
        </Link>
        <Link href="/"
          className="px-5 py-2 rounded-[var(--radius-card)] border text-sm font-medium hover:bg-muted transition-colors">
          Back to home
        </Link>
      </div>
    </main>
  );
}
