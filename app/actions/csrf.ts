"use server";
import { issueCsrfToken } from "@/lib/csrf";

/**
 * Called once on dashboard/form mount.
 * Sets the __csrf cookie and returns the token for the client to embed
 * as a hidden field in every protected form.
 */
export async function getCsrfTokenAction(): Promise<string> {
  return issueCsrfToken();
}
