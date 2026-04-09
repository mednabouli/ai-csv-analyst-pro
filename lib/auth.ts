import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import { Resend } from "resend";

const resend  = new Resend(process.env.RESEND_API_KEY!);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;
const APP_NAME = "CSV Analyst Pro";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),

  // ── Email + password ────────────────────────────────────────────────────
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    sendResetPassword: async ({ user, url }) => {
      await resend.emails.send({
        from: `${APP_NAME} <noreply@${process.env.EMAIL_DOMAIN}>`,
        to:   user.email,
        subject: "Reset your password",
        html: emailTemplate({
          heading: "Reset your password",
          body:    "Click the button below to reset your password. This link expires in 1 hour.",
          cta:     { label: "Reset Password", url },
          footer:  "If you didn\'t request a password reset, you can safely ignore this email.",
        }),
      });
    },
  },

  // ── Email verification ──────────────────────────────────────────────────
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await resend.emails.send({
        from: `${APP_NAME} <noreply@${process.env.EMAIL_DOMAIN}>`,
        to:   user.email,
        subject: `Verify your ${APP_NAME} email`,
        html: emailTemplate({
          heading: "Verify your email",
          body:    "Click the button below to verify your email address and activate your account.",
          cta:     { label: "Verify Email", url },
          footer:  "This link expires in 24 hours. If you didn\'t sign up, you can safely ignore this.",
        }),
      });
    },
  },

  // ── OAuth ───────────────────────────────────────────────────────────────
  socialProviders: {
    google: {
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    github: {
      clientId:     process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
  },

  // ── Session ─────────────────────────────────────────────────────────────
  // FIX: set expiresIn to 30 days — this is the "remember me" duration.
  // When the user does NOT check "remember me" in the login form, the client
  // calls signIn.email({ dontRememberMe: true }) which instructs better-auth
  // to issue a session-scoped cookie instead of a persistent 30-day one.
  // No custom headers or server-side hacks required.
  session: {
    expiresIn:   60 * 60 * 24 * 30,   // 30 days  (persistent / "remember me")
    updateAge:   60 * 60 * 24,         // refresh the token once per day
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },

  // ── Account ─────────────────────────────────────────────────────────────
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google", "github"],
    },
  },

  // ── Plugins ─────────────────────────────────────────────────────────────
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
export type User    = typeof auth.$Infer.Session.user;

// ── Email template ───────────────────────────────────────────────────────────
function emailTemplate(opts: {
  heading: string;
  body:    string;
  cta:     { label: string; url: string };
  footer:  string;
}): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="padding:40px 48px 32px;border-bottom:1px solid #eee;">
          <p style="margin:0;font-size:22px;font-weight:700;color:#111;">${APP_NAME}</p>
        </td></tr>
        <tr><td style="padding:40px 48px;">
          <h1 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#111;">${opts.heading}</h1>
          <p style="margin:0 0 32px;font-size:15px;color:#555;line-height:1.6;">${opts.body}</p>
          <a href="${opts.cta.url}" style="display:inline-block;padding:13px 28px;background:#6366f1;color:#fff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;">${opts.cta.label}</a>
        </td></tr>
        <tr><td style="padding:24px 48px 40px;background:#fafafa;border-top:1px solid #eee;">
          <p style="margin:0;font-size:13px;color:#888;line-height:1.5;">${opts.footer}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
