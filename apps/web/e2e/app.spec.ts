import { test, expect } from "@playwright/test";

test("import screen renders", async ({ page }) => {
  await page.goto("/import");
  await expect(page.getByTestId("import-screen")).toBeVisible();
  await expect(page).toHaveScreenshot("import.png");
});

test("datasets screen renders", async ({ page }) => {
  await page.goto("/datasets");
  await expect(page.getByTestId("dataset-screen")).toBeVisible();
  await expect(page).toHaveScreenshot("datasets.png");
});
