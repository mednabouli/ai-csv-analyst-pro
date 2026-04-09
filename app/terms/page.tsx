import Link from "next/link";

const EFFECTIVE = "April 9, 2026";
const APP = "CSV Analyst Pro";
const EMAIL = "legal@csvanalystpro.com";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="space-y-2 text-muted-foreground leading-relaxed">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-16 space-y-10">
        {/* Header */}
        <div className="space-y-2 pb-6 border-b">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← {APP}
          </Link>
          <h1 className="text-3xl font-bold">Terms of Service</h1>
          <p className="text-sm text-muted-foreground">Effective date: {EFFECTIVE}</p>
        </div>

        <Section title="1. Acceptance of Terms">
          <p>
            By accessing or using {APP} ("Service"), you agree to be bound by these Terms of
            Service ("Terms"). If you do not agree to these Terms, do not use the Service.
          </p>
          <p>
            These Terms apply to all visitors, users, and others who access or use the Service.
            We reserve the right to update these Terms at any time. Continued use of the Service
            after changes constitutes acceptance of the revised Terms.
          </p>
        </Section>

        <Section title="2. Description of Service">
          <p>
            {APP} is an AI-powered data analysis platform that allows users to upload CSV files
            and interact with their data through a natural language chat interface. The Service
            uses large language models ("LLMs") from third-party providers to generate responses.
          </p>
          <p>
            AI-generated responses are for informational purposes only and should not be relied
            upon as professional financial, legal, or medical advice.
          </p>
        </Section>

        <Section title="3. User Accounts">
          <p>
            You must create an account to use the Service. You are responsible for maintaining
            the confidentiality of your account credentials and for all activity that occurs under
            your account. You must immediately notify us of any unauthorised use of your account.
          </p>
          <p>
            You must be at least 16 years of age to create an account. By registering, you
            represent that you meet this requirement.
          </p>
        </Section>

        <Section title="4. Your Data">
          <p>
            You retain all ownership rights to the CSV data you upload ("User Data"). By
            uploading data, you grant us a limited, non-exclusive licence to process, store, and
            transmit your data solely to provide the Service.
          </p>
          <p>
            You are solely responsible for ensuring you have the right to upload and process any
            data you submit. Do not upload data containing sensitive personal information, payment
            card data, health records, or government-issued identification numbers.
          </p>
          <p>
            We do not sell, share, or use your User Data to train AI models without your explicit
            written consent. Uploaded files and conversation history are deleted when you delete
            a session or close your account.
          </p>
        </Section>

        <Section title="5. Acceptable Use">
          <p>You agree not to use the Service to:</p>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>Upload data you do not have the right to process or share</li>
            <li>Attempt to reverse-engineer or extract underlying AI model weights</li>
            <li>Circumvent rate limits, usage quotas, or access controls</li>
            <li>Use the Service for any unlawful purpose or in violation of any regulation</li>
            <li>Distribute malware or engage in any activity that disrupts the Service</li>
            <li>Scrape, crawl, or systematically extract content from the Service</li>
          </ul>
        </Section>

        <Section title="6. Subscription and Billing">
          <p>
            The Service is offered on a subscription basis with Free, Starter, and Pro tiers.
            Paid plans are billed monthly or annually through our payment processor (Stripe).
            All fees are non-refundable except as required by applicable law.
          </p>
          <p>
            You may cancel your subscription at any time. Cancellation takes effect at the end
            of the current billing period. We reserve the right to modify pricing with 30 days
            notice to current subscribers.
          </p>
        </Section>

        <Section title="7. Intellectual Property">
          <p>
            The Service, including all software, design, trademarks, and content created by us,
            is owned by {APP} and protected by applicable intellectual property laws. Nothing in
            these Terms transfers ownership of our intellectual property to you.
          </p>
          <p>
            AI-generated content produced in response to your queries is provided to you with a
            broad licence to use for your own purposes, subject to these Terms.
          </p>
        </Section>

        <Section title="8. Disclaimer of Warranties">
          <p>
            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND,
            EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY,
            FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE
            SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR THAT AI OUTPUTS WILL BE ACCURATE.
          </p>
        </Section>

        <Section title="9. Limitation of Liability">
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, {APP.toUpperCase()} SHALL NOT BE LIABLE FOR
            ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS
            OF PROFITS OR DATA, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE SERVICE,
            EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
          </p>
          <p>
            OUR TOTAL LIABILITY TO YOU FOR ANY CLAIM ARISING FROM THESE TERMS OR THE SERVICE
            SHALL NOT EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID TO US IN THE 12 MONTHS
            PRECEDING THE CLAIM OR (B) USD $50.
          </p>
        </Section>

        <Section title="10. Termination">
          <p>
            We reserve the right to suspend or terminate your account at our discretion if you
            violate these Terms or engage in activity that harms the Service or other users.
            Upon termination, your right to use the Service ceases immediately.
          </p>
          <p>
            You may delete your account at any time from your account settings. Account deletion
            permanently removes all your data from our systems within 30 days.
          </p>
        </Section>

        <Section title="11. Governing Law">
          <p>
            These Terms are governed by the laws of the Province of Quebec, Canada, without
            regard to its conflict of law provisions. Any disputes shall be resolved in the
            courts located in Montréal, Quebec.
          </p>
        </Section>

        <Section title="12. Contact">
          <p>
            Questions about these Terms should be sent to{" "}
            <a href={`mailto:${EMAIL}`} className="text-primary underline underline-offset-2">
              {EMAIL}
            </a>
            .
          </p>
        </Section>

        <div className="pt-6 border-t flex gap-4 text-sm text-muted-foreground">
          <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
          <Link href="/login"   className="hover:text-foreground transition-colors">Sign in</Link>
          <Link href="/signup"  className="hover:text-foreground transition-colors">Create account</Link>
        </div>
      </div>
    </main>
  );
}
