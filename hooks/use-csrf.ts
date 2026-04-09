"use client";
import { useState, useEffect, useCallback } from "react";
import { getCsrfTokenAction } from "@/app/actions/csrf";

/**
 * Fetches a CSRF token on mount (calls getCsrfTokenAction which also sets
 * the __csrf cookie), caches it in state, and exposes:
 *
 *   csrfToken  — current token string ('' while loading)
 *   appendCsrf — helper that appends "_csrf" field to any FormData
 *   refresh    — manually rotate the token (call after 8-hour sessions)
 */
export function useCsrf() {
  const [csrfToken, setCsrfToken] = useState("");

  const refresh = useCallback(async () => {
    const token = await getCsrfTokenAction();
    setCsrfToken(token);
  }, []);

  useEffect(() => { refresh(); }, []);

  /** Append the CSRF field to an existing FormData before submitting. */
  const appendCsrf = useCallback(
    (fd: FormData): FormData => {
      if (csrfToken) fd.set("_csrf", csrfToken);
      return fd;
    },
    [csrfToken]
  );

  return { csrfToken, appendCsrf, refresh } as const;
}
