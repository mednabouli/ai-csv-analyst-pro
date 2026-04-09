import { type Page } from "@playwright/test";

export const TEST_USER = {
  name:     process.env.E2E_USER_NAME     || "E2E Test User",
  email:    process.env.E2E_USER_EMAIL    || "e2e@csvanalystpro.dev",
  password: process.env.E2E_USER_PASSWORD || "E2eTestPass123!",
};

/** Fill the login form and wait for the dashboard redirect. */
export async function loginViaUI(page: Page): Promise<void> {
  await page.goto("/login");
  await page.waitForSelector('[name="email"]');

  await page.fill('[name="email"]',    TEST_USER.email);
  await page.fill('[name="password"]', TEST_USER.password);

  // Ensure "Remember me" is checked so the session persists in storageState
  const remember = page.locator('[name="rememberMe"]');
  if (!(await remember.isChecked())) await remember.check();

  await page.click('[type="submit"]');
  await page.waitForURL("/dashboard", { timeout: 20_000 });
}
