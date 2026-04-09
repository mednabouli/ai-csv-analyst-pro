import { cookies } from "next/headers";
import crypto from "crypto";

const COOKIE = "__csrf";
const FIELD  = "_csrf";
const SECRET = () => process.env.BETTER_AUTH_SECRET ?? "fallback-dev-only-secret";

// ── Token helpers ─────────────────────────────────────────────────────────────

/** Create an HMAC-signed token:  <nonce>.<base64url-signature> */
function makeToken(): string {
  const nonce = crypto.randomBytes(20).toString("base64url");
  const sig   = crypto.createHmac("sha256", SECRET()).update(nonce).digest("base64url");
  return `${nonce}.${sig}`;
}

/** Verify the HMAC signature of a token without leaking timing info. */
function isTokenValid(token: string): boolean {
  const dot = token.lastIndexOf(".");
  if (dot === -1) return false;
  const nonce    = token.slice(0, dot);
  const sig      = token.slice(dot + 1);
  const expected = crypto.createHmac("sha256", SECRET()).update(nonce).digest("base64url");
  try {
    return crypto.timingSafeEqual(Buffer.from(sig, "base64url"), Buffer.from(expected, "base64url"));
  } catch {
    return false;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate a new CSRF token, persist it in a SameSite=Strict cookie,
 * and return the token string so the caller can embed it in a form/state.
 *
 * Call this from a Server Action (e.g. getCsrfTokenAction) on page mount.
 */
export async function issueCsrfToken(): Promise<string> {
  const token = makeToken();
  const jar   = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: false,        // must be readable by the client for double-submit
    sameSite: "strict",
    secure:   process.env.NODE_ENV === "production",
    path:     "/",
    maxAge:   60 * 60 * 8, // 8-hour window — refreshed on every page load
  });
  return token;
}

/**
 * Validate CSRF for a Server Action.
 * Throws a 403-style error if the token is missing, forged, or expired.
 *
 * @param formData  The FormData from the action (must contain field "_csrf")
 */
export async function validateCsrf(formData: FormData): Promise<void> {
  const formToken = formData.get(FIELD);

  if (typeof formToken !== "string" || !formToken) {
    throw Object.assign(new Error("CSRF token missing"), { csrf: true, status: 403 });
  }

  const jar         = await cookies();
  const cookieToken = jar.get(COOKIE)?.value ?? "";

  if (!cookieToken) {
    throw Object.assign(new Error("CSRF cookie missing"), { csrf: true, status: 403 });
  }

  // 1. Cookie value must equal the form value (double-submit check)
  // 2. The HMAC signature must be valid (prevents forged tokens)
  const tokensMatch = cookieToken === formToken;
  const sigValid    = isTokenValid(formToken);

  if (!tokensMatch || !sigValid) {
    throw Object.assign(new Error("CSRF validation failed"), { csrf: true, status: 403 });
  }
}

/** Name of the hidden form field.  Use as: <input name={CSRF_FIELD} value={csrfToken} /> */
export const CSRF_FIELD = FIELD;
