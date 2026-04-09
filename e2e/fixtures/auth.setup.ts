import { test as setup } from "@playwright/test";
import { loginViaUI } from "../helpers/auth";

const AUTH_FILE = "e2e/.auth/user.json";

setup("authenticate", async ({ page }) => {
  await loginViaUI(page);
  await page.context().storageState({ path: AUTH_FILE });
});
