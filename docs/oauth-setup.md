# OAuth + Stripe Setup Guide

This guide covers the one-time setup required before deploying to production.
All steps require a browser and take ~30 minutes total.

---

## 1. Google OAuth

### Create a Google Cloud project
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Click **Select a project → New Project**
3. Name it `csv-analyst-pro` → **Create**

### Enable the API
4. **APIs & Services → Enable APIs and Services**
5. Search for **Google Identity** → **Enable**

### Create OAuth credentials
6. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
7. Application type: **Web application**
8. Name: `CSV Analyst Pro`
9. Authorised redirect URIs — add all of:
   ```
   http://localhost:3000/api/auth/callback/google
   https://your-domain.vercel.app/api/auth/callback/google
   https://csvanalystpro.com/api/auth/callback/google
   ```
10. Click **Create** → copy **Client ID** and **Client Secret**

### Add to .env.local
```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
```

---

## 2. GitHub OAuth

### Create a GitHub OAuth App
1. Go to [github.com/settings/developers](https://github.com/settings/developers)
2. **OAuth Apps → New OAuth App**
3. Fill in:
   | Field | Value |
   |---|---|
   | Application name | CSV Analyst Pro |
   | Homepage URL | `https://csvanalystpro.com` |
   | Authorization callback URL | `https://csvanalystpro.com/api/auth/callback/github` |
4. Click **Register application**
5. Click **Generate a new client secret**
6. Copy **Client ID** and **Client Secret**

> For local dev, create a **second** OAuth app with callback URL `http://localhost:3000/api/auth/callback/github` and add those to `.env.local`.

### Add to .env.local
```env
GITHUB_CLIENT_ID=Iv1.xxxxx
GITHUB_CLIENT_SECRET=xxxxx
```

---

## 3. Stripe Products

Run the automated setup script (handles product + price creation):

```bash
# Test mode (uses test keys from .env.local)
pnpm stripe:setup

# Live mode
STRIPE_SECRET_KEY=sk_live_... pnpm stripe:setup
```

Copy the output into `.env.local`:
```env
STRIPE_PRICE_STARTER_MONTHLY=price_xxx
STRIPE_PRICE_STARTER_YEARLY=price_xxx
STRIPE_PRICE_PRO_MONTHLY=price_xxx
STRIPE_PRICE_PRO_YEARLY=price_xxx
```

### Set up Stripe Webhook (local dev)
```bash
# Install Stripe CLI: https://stripe.com/docs/stripe-cli
stripe login
stripe listen --forward-to localhost:3000/api/billing/webhook
# Copy the webhook signing secret it prints:
```
```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Set up Stripe Webhook (production)
1. Go to [dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)
2. **Add endpoint** → `https://csvanalystpro.com/api/billing/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copy the **Signing secret** → add to Vercel env vars as `STRIPE_WEBHOOK_SECRET`

---

## 4. Resend Email

1. Go to [resend.com](https://resend.com) → sign up
2. **API Keys → Create API Key** → copy it
3. **Domains → Add Domain** → enter your domain
4. Follow the DNS record instructions (SPF, DKIM, DMARC)
5. Wait for verification (usually < 5 minutes)

```env
RESEND_API_KEY=re_...
EMAIL_DOMAIN=csvanalystpro.com
```

---

## 5. Vercel Environment Variables

After setting all env vars in `.env.local`, push them to Vercel:

```bash
# Install Vercel CLI
pnpm add -g vercel

# Pull existing env (if any)
vercel env pull

# Or set individually via dashboard:
# vercel.com → Project → Settings → Environment Variables
```

Required production vars (in addition to what you have locally):
- `NEXT_PUBLIC_APP_URL=https://csvanalystpro.com`
- `SENTRY_DSN` (from sentry.io)
- `LANGFUSE_PUBLIC_KEY` + `LANGFUSE_SECRET_KEY` (from cloud.langfuse.com)
- All `STRIPE_*`, `GOOGLE_*`, `GITHUB_*`, `RESEND_*` vars

---

## 6. E2E Test Secrets (GitHub)

Go to **github.com → repo → Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Value |
|---|---|
| `BETTER_AUTH_SECRET` | Same as .env.local |
| `DATABASE_URL` | Test database URL (separate from prod!) |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token |
| `GOOGLE_GENERATIVE_AI_API_KEY` | For the chat e2e test |
| `E2E_USER_EMAIL` | `e2e@csvanalystpro.dev` |
| `E2E_USER_PASSWORD` | `E2eTestPass123!` |
