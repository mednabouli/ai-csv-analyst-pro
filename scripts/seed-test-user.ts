#!/usr/bin/env tsx
/**
 * Creates (or resets) the e2e test user in the database.
 * Run before Playwright: pnpm db:seed:test
 *
 * The user is inserted with emailVerified=true so e2e tests
 * don't need to handle the email verification flow.
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "@/lib/db";
import { users, accounts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import crypto from "crypto";

const EMAIL    = process.env.E2E_USER_EMAIL    ?? "e2e@csvanalystpro.dev";
const PASSWORD = process.env.E2E_USER_PASSWORD ?? "E2eTestPass123!";
const NAME     = process.env.E2E_USER_NAME     ?? "E2E Test User";

// better-auth uses scrypt for password hashing
async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(password, salt, 64, (err, hash) => {
      if (err) reject(err);
      else resolve(`${salt}:${hash.toString("hex")}`);
    });
  });
}

async function main() {
  console.log(`Seeding test user: ${EMAIL}`);

  // Delete existing test user if present (idempotent)
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, EMAIL));
  if (existing.length) {
    const userId = existing[0].id;
    await db.delete(accounts).where(eq(accounts.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
    console.log("  Removed existing test user");
  }

  const userId   = uuid();
  const hashedPw = await hashPassword(PASSWORD);

  await db.insert(users).values({
    id:            userId,
    email:         EMAIL,
    name:          NAME,
    emailVerified: true,    // skip email verification in e2e
    createdAt:     new Date(),
    updatedAt:     new Date(),
  });

  await db.insert(accounts).values({
    id:                uuid(),
    userId,
    accountId:         userId,
    providerId:        "credential",
    password:          hashedPw,
    createdAt:         new Date(),
    updatedAt:         new Date(),
  });

  console.log(`  Created: ${EMAIL}`);
  console.log(`  Password: ${PASSWORD}`);
  console.log("Done. Run pnpm test:e2e to execute e2e tests.");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
