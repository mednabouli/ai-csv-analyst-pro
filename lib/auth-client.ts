"use client";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL!,
});

export const {
  useSession,
  signIn,
  signOut,
  signUp,
  requestPasswordReset,
  resetPassword,
  sendVerificationEmail,
} = authClient;

export type ClientSession = typeof authClient.$Infer.Session;
