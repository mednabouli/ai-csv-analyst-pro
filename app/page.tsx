import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-8">
      <div className="text-center space-y-4 max-w-2xl">
        <h1 className="text-5xl font-bold tracking-tight">
          CSV Analyst Pro
        </h1>
        <p className="text-xl text-muted-foreground">
          Upload any CSV file. Ask questions in plain language.
          Get instant, AI-powered data insights.
        </p>
        <div className="flex gap-4 justify-center pt-4">
          <Link
            href="/dashboard"
            className="px-6 py-3 rounded-[var(--radius-card)] bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
          >
            Open Dashboard
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 rounded-[var(--radius-card)] border font-medium hover:bg-muted transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-6 max-w-3xl w-full mt-8">
        {[
          { title: "Upload CSV", desc: "Any size, any structure. Instant parsing." },
          { title: "Ask Questions", desc: "Natural language. No SQL required." },
          { title: "Switch Models", desc: "Gemma 4, Claude, GPT-4o and more." },
        ].map((card) => (
          <div key={card.title} className="p-6 rounded-[var(--radius-card)] border shadow-[var(--shadow-card)] space-y-2">
            <h3 className="font-semibold">{card.title}</h3>
            <p className="text-sm text-muted-foreground">{card.desc}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
