import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,

  // 10% of traces in production
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Only log errors (not every console.error)
  integrations: [Sentry.consoleIntegration({ levels: ["error"] })],

  sendDefaultPii: false,

  beforeSend(event) {
    // Drop health check errors
    if (event.request?.url?.includes("/health")) return null;
    return event;
  },
});
