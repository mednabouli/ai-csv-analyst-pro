import Link from "next/link";

const EFFECTIVE = "April 9, 2026";
const APP  = "CSV Analyst Pro";
const EMAIL = "privacy@csvanalystpro.com";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="space-y-2 text-muted-foreground leading-relaxed">{children}</div>
    </section>
  );
}

function DataRow({ name, purpose, retention }: { name: string; purpose: string; retention: string }) {
  return (
    <tr className="border-b last:border-0 even:bg-muted/20">
      <td className="py-2 pr-4 text-sm font-medium text-foreground">{name}</td>
      <td className="py-2 pr-4 text-sm">{purpose}</td>
      <td className="py-2 text-sm">{retention}</td>
    </tr>
  );
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-16 space-y-10">
        {/* Header */}
        <div className="space-y-2 pb-6 border-b">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← {APP}
          </Link>
          <h1 className="text-3xl font-bold">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Effective date: {EFFECTIVE}</p>
          <p className="text-sm text-muted-foreground">
            This policy describes how {APP} ("we", "us") collects, uses, and protects
            personal information when you use our Service.
          </p>
        </div>

        <Section title="1. Data We Collect">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="py-2 pr-4 text-sm font-semibold text-foreground">Data</th>
                  <th className="py-2 pr-4 text-sm font-semibold text-foreground">Purpose</th>
                  <th className="py-2 text-sm font-semibold text-foreground">Retention</th>
                </tr>
              </thead>
              <tbody>
                <DataRow name="Email address" purpose="Account creation, notifications, login" retention="Until account deletion" />
                <DataRow name="Name" purpose="Personalisation, support" retention="Until account deletion" />
                <DataRow name="Password (hashed)" purpose="Authentication — never stored in plain text" retention="Until account deletion" />
                <DataRow name="CSV file contents" purpose="Indexing for AI chat responses" retention="Until session deletion" />
                <DataRow name="Chat messages" purpose="Conversation history and session resume" retention="Until session deletion" />
                <DataRow name="Usage counters" purpose="Plan enforcement and billing" retention="90 days rolling" />
                <DataRow name="Payment info" purpose="Billing — handled entirely by Stripe" retention="Per Stripe's policy" />
                <DataRow name="IP address / logs" purpose="Rate limiting, abuse prevention, debugging" retention="30 days" />
                <DataRow name="Session tokens" purpose="Keeping you signed in" retention="7–30 days depending on settings" />
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="2. How We Use Your Data">
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>To provide and improve the Service</li>
            <li>To generate AI responses based on your uploaded CSV data</li>
            <li>To send transactional emails (verification, password reset, billing receipts)</li>
            <li>To enforce usage limits and prevent abuse</li>
            <li>To diagnose errors and monitor performance via Sentry and Langfuse</li>
            <li>To comply with legal obligations</li>
          </ul>
          <p className="text-sm font-medium text-foreground pt-1">
            We do not sell your personal data. We do not use your data for advertising.
            We do not use your CSV data or chat history to train AI models.
          </p>
        </Section>

        <Section title="3. Third-Party Services">
          <p>
            We use the following sub-processors to operate the Service. Each operates under
            its own privacy policy and data processing agreements with us:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li><strong className="text-foreground">Neon (Neon Inc.)</strong> — PostgreSQL database hosting (US)</li>
            <li><strong className="text-foreground">Vercel Inc.</strong> — Application hosting and edge network (US)</li>
            <li><strong className="text-foreground">OpenAI / Anthropic / Google</strong> — LLM inference for chat responses (US) — your query and relevant CSV chunks are sent to the model; full file is never transmitted</li>
            <li><strong className="text-foreground">Stripe, Inc.</strong> — Payment processing and subscription management (US)</li>
            <li><strong className="text-foreground">Resend</strong> — Transactional email delivery (US)</li>
            <li><strong className="text-foreground">Upstash</strong> — Redis rate-limiting counters (EU/US)</li>
            <li><strong className="text-foreground">Sentry</strong> — Error monitoring — stack traces may contain request metadata (US)</li>
            <li><strong className="text-foreground">Langfuse</strong> — LLM observability — prompts and completions are logged (EU)</li>
          </ul>
        </Section>

        <Section title="4. Cookies and Tracking">
          <p>
            We use only essential cookies required to operate the Service (session token,
            CSRF token). We do not use advertising cookies, tracking pixels, or third-party
            analytics that profile your behaviour.
          </p>
          <p>
            Dark-mode preference is stored in <code className="px-1 py-0.5 bg-muted rounded text-xs font-mono">localStorage</code> on
            your device — this is never transmitted to our servers.
          </p>
        </Section>

        <Section title="5. Data Security">
          <p>
            We apply industry-standard security measures including: TLS encryption in transit,
            AES-256 encryption at rest (managed by Neon), hashed passwords (never stored in
            plain text), session tokens rotated on sign-out, and strict row-level database access
            controls that scope every query to the authenticated user.
          </p>
          <p>
            No security measure is 100% guaranteed. If you discover a vulnerability,
            please disclose it responsibly to{" "}
            <a href="mailto:security@csvanalystpro.com" className="text-primary underline underline-offset-2">
              security@csvanalystpro.com
            </a>.
          </p>
        </Section>

        <Section title="6. Your Rights">
          <p>
            Depending on your jurisdiction (GDPR, PIPEDA, CCPA, etc.), you may have the right to:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li><strong className="text-foreground">Access</strong> — request a copy of all data we hold about you</li>
            <li><strong className="text-foreground">Rectification</strong> — correct inaccurate personal data</li>
            <li><strong className="text-foreground">Erasure</strong> — delete your account and all associated data</li>
            <li><strong className="text-foreground">Portability</strong> — receive your data in a machine-readable format</li>
            <li><strong className="text-foreground">Objection</strong> — object to specific processing activities</li>
          </ul>
          <p className="text-sm">
            To exercise any of these rights, email us at{" "}
            <a href={`mailto:${EMAIL}`} className="text-primary underline underline-offset-2">{EMAIL}</a>.
            We respond to all requests within 30 days.
          </p>
        </Section>

        <Section title="7. Children's Privacy">
          <p>
            The Service is not directed to children under 16. We do not knowingly collect
            personal data from children. If you believe a child has provided us with personal
            data, please contact us immediately.
          </p>
        </Section>

        <Section title="8. Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. We will notify you of
            significant changes by email (to your registered address) or by posting a notice
            in the Service at least 14 days before the change takes effect.
          </p>
        </Section>

        <Section title="9. Contact">
          <p>
            For privacy questions or to exercise your rights, contact our privacy team at{" "}
            <a href={`mailto:${EMAIL}`} className="text-primary underline underline-offset-2">
              {EMAIL}
            </a>
            . Our registered address is available on request.
          </p>
        </Section>

        <div className="pt-6 border-t flex gap-4 text-sm text-muted-foreground">
          <Link href="/terms"  className="hover:text-foreground transition-colors">Terms of Service</Link>
          <Link href="/login"  className="hover:text-foreground transition-colors">Sign in</Link>
          <Link href="/signup" className="hover:text-foreground transition-colors">Create account</Link>
        </div>
      </div>
    </main>
  );
}
