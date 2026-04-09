import { test, expect } from "@playwright/test";
import { TEST_USER } from "./helpers/auth";

// These tests run WITHOUT storageState — they exercise unauthenticated surfaces
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Authentication", () => {

  test.describe("Unauthenticated redirects", () => {
    test("dashboard redirects unauthenticated users to /login", async ({ page }) => {
      await page.goto("/dashboard");
      await expect(page).toHaveURL(/\/login/);
    });

    test("billing redirects unauthenticated users to /login", async ({ page }) => {
      await page.goto("/billing");
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe("Public pages", () => {
    test("login page renders without crashing", async ({ page }) => {
      await page.goto("/login");
      await expect(page.locator('[name="email"]')).toBeVisible();
      await expect(page.locator('[name="password"]')).toBeVisible();
      await expect(page.locator('[type="submit"]')).toBeVisible();
    });

    test("signup page renders without crashing", async ({ page }) => {
      await page.goto("/signup");
      await expect(page.locator('[name="email"]')).toBeVisible();
      await expect(page.locator('[name="password"]')).toBeVisible();
    });

    test("/terms renders full page with headings", async ({ page }) => {
      await page.goto("/terms");
      await expect(page.getByRole("heading", { name: "Terms of Service" })).toBeVisible();
      await expect(page.getByText("Acceptance of Terms")).toBeVisible();
    });

    test("/privacy renders full page with data table", async ({ page }) => {
      await page.goto("/privacy");
      await expect(page.getByRole("heading", { name: "Privacy Policy" })).toBeVisible();
      await expect(page.getByText("Email address")).toBeVisible();
    });

    test("custom 404 page renders on unknown route", async ({ page }) => {
      await page.goto("/this-page-does-not-exist-xyz");
      await expect(page.getByText("404")).toBeVisible();
      await expect(page.getByText(/page you.+looking for/i)).toBeVisible();
      await expect(page.getByRole("link", { name: /dashboard/i })).toBeVisible();
    });
  });

  test.describe("Login form", () => {
    test("shows an error on wrong password", async ({ page }) => {
      await page.goto("/login");
      await page.fill('[name="email"]',    TEST_USER.email);
      await page.fill('[name="password"]', "wrong-password-xyz");
      await page.click('[type="submit"]');

      // Error message should appear — no redirect
      await expect(page.locator("text=/invalid|incorrect|password/i")).toBeVisible({ timeout: 8_000 });
      await expect(page).not.toHaveURL(/\/dashboard/);
    });

    test("successful login redirects to dashboard", async ({ page }) => {
      await page.goto("/login");
      await page.fill('[name="email"]',    TEST_USER.email);
      await page.fill('[name="password"]', TEST_USER.password);
      await page.click('[type="submit"]');

      await expect(page).toHaveURL("/dashboard", { timeout: 20_000 });
      // Verify we're actually on the dashboard shell
      await expect(page.getByText(/CSV Analyst Pro/i)).toBeVisible();
    });
  });
});
