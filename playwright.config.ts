import { defineConfig, devices } from "@playwright/test";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

export default defineConfig({
  testDir:       "./e2e",
  fullyParallel: true,
  forbidOnly:    !!process.env.CI,
  retries:       process.env.CI ? 2 : 0,
  workers:       process.env.CI ? 1 : undefined,
  reporter: [
    ["html", { outputFolder: "playwright-report" }],
    ["list"],
  ],
  use: {
    baseURL:          process.env.BASE_URL || "http://localhost:3000",
    trace:            "on-first-retry",
    screenshot:       "only-on-failure",
    video:            "retain-on-failure",
  },

  projects: [
    // ── 1. Auth setup — runs once, saves cookie state ──────────────────────
    {
      name:      "setup",
      testMatch: /.*\.setup\.ts/,
    },
    // ── 2. Desktop Chrome — depends on auth setup ─────────────────────────
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/user.json",
      },
      dependencies: ["setup"],
    },
    // ── 3. Mobile Chrome — test responsive layout ─────────────────────────
    {
      name: "mobile",
      use: {
        ...devices["Pixel 5"],
        storageState: "e2e/.auth/user.json",
      },
      dependencies: ["setup"],
    },
  ],

  webServer: {
    command:             "pnpm dev",
    url:                 "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout:             120_000,
  },
});
