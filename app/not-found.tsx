import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="space-y-2">
        <h1 className="text-8xl font-black text-muted-foreground/30">404</h1>
        <h2 className="text-2xl font-bold">Page not found</h2>
        <p className="text-muted-foreground max-w-sm">
          The page you are looking for does not exist or has been moved.
        </p>
      </div>
      <Link href="/"
        className="px-6 py-2.5 rounded-[var(--radius-card)] bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity">
        Back to home
      </Link>
    </main>
  );
}
