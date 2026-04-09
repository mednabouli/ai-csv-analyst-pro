
import { test, expect } from "@playwright/test";
import path from "path";

const SAMPLE_CSV = path.join(__dirname, "fixtures/sample.csv");

test.describe("Upload + Chat Flow", () => {

  test("dashboard renders the upload zone when no session is active", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("Upload a CSV file")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Choose a CSV file")).toBeVisible();
  });

  test("sidebar renders with 'New analysis' button", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("button", { name: /new analysis/i })).toBeVisible({ timeout: 15_000 });
  });

  // ── Full upload flow ───────────────────────────────────────────────────────
  test.describe("CSV upload", () => {
    test("uploading sample.csv shows a success toast and opens a session", async ({ page }) => {
      await page.goto("/dashboard");

      // Attach the file to the hidden input
      const fileInput = page.locator('input[type="file"][name="file"]');
      await fileInput.setInputFiles(SAMPLE_CSV);

      // Success toast
      await expect(page.getByText(/file ready|sample\.csv/i)).toBeVisible({ timeout: 30_000 });

      // Upload zone replaced by chat interface
      await expect(page.getByText("Upload a CSV file")).not.toBeVisible({ timeout: 5_000 });

      // CSV preview table (first 10 rows)
      await expect(page.locator("table")).toBeVisible({ timeout: 10_000 });
    });

    test("sidebar shows the new session after upload", async ({ page }) => {
      await page.goto("/dashboard");

      const fileInput = page.locator('input[type="file"][name="file"]');
      await fileInput.setInputFiles(SAMPLE_CSV);
      await page.waitForSelector("text=/file ready|sample\\.csv/i", { timeout: 30_000 });

      // File name appears in the sidebar
      await expect(page.getByText("sample.csv")).toBeVisible({ timeout: 5_000 });
    });

    test("suggestion chips appear after upload", async ({ page }) => {
      await page.goto("/dashboard");

      const fileInput = page.locator('input[type="file"][name="file"]');
      await fileInput.setInputFiles(SAMPLE_CSV);
      await page.waitForSelector("text=/file ready|sample\\.csv/i", { timeout: 30_000 });

      await expect(page.getByRole("button", { name: /column names/i })).toBeVisible({ timeout: 5_000 });
    });

    test("suggestion chip sends a real message on click", async ({ page }) => {
      await page.goto("/dashboard");

      const fileInput = page.locator('input[type="file"][name="file"]');
      await fileInput.setInputFiles(SAMPLE_CSV);
      await page.waitForSelector("text=/file ready|sample\\.csv/i", { timeout: 30_000 });

      // Click the first suggestion chip
      await page.getByRole("button", { name: /column names/i }).click();

      // Message should appear in the chat
      await expect(page.getByText(/column names/i)).toBeVisible({ timeout: 5_000 });

      // Loading indicator appears (AI is streaming)
      const dots = page.locator(".animate-bounce").first();
      await expect(dots).toBeVisible({ timeout: 5_000 });

      // Wait for the AI response to appear
      await expect(page.locator('[class*="bg-muted"][class*="rounded-2xl"]').last())
        .not.toBeEmpty({ timeout: 45_000 });
    });

    test("typing a message and pressing Enter sends it", async ({ page }) => {
      await page.goto("/dashboard");

      const fileInput = page.locator('input[type="file"][name="file"]');
      await fileInput.setInputFiles(SAMPLE_CSV);
      await page.waitForSelector("text=/file ready|sample\\.csv/i", { timeout: 30_000 });

      const textarea = page.locator("textarea");
      await textarea.fill("How many rows are in this dataset?");
      await textarea.press("Enter");

      // User message bubble
      await expect(page.getByText("How many rows are in this dataset?")).toBeVisible({ timeout: 5_000 });

      // AI streams a response containing "20" (our fixture has 20 rows)
      await expect(page.getByText(/20|twenty/i)).toBeVisible({ timeout: 45_000 });
    });
  });

  // ── Mobile layout ──────────────────────────────────────────────────────────
  test.describe("Mobile layout", () => {
    test("sidebar is hidden by default on mobile", async ({ page }) => {
      await page.goto("/dashboard");
      // The sidebar (md:relative) is hidden on mobile via translate-x-full
      const sidebar = page.locator("aside").first();
      // Sidebar should not be visually accessible (off screen)
      await expect(sidebar).toHaveCSS("transform", /-translate|matrix.*-\d+/);
    });

    test("hamburger button toggles sidebar on mobile", async ({ page }) => {
      await page.goto("/dashboard");
      const menuButton = page.getByRole("button", { name: /toggle sidebar/i });
      await expect(menuButton).toBeVisible();
      await menuButton.click();
      // Overlay appears
      await expect(page.locator(".bg-black\\/50")).toBeVisible();
    });
  });
});
