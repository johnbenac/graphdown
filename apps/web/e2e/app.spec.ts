import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addStyleTag({
    content: "*{animation:none !important;transition:none !important;}",
  });
});

test("import screen renders", async ({ page }) => {
  await page.goto("/import");
  await expect(page.getByTestId("import-screen")).toBeVisible();
  await expect(page.getByText(/upload a dataset zip/i)).toBeVisible();
  await expect(page).toHaveScreenshot("import.png");
});

test("dataset screen renders", async ({ page }) => {
  await page.goto("/datasets");
  await expect(page.getByTestId("dataset-screen")).toBeVisible();
  await expect(page.getByText(/import a dataset to begin/i)).toBeVisible();
  await expect(page).toHaveScreenshot("datasets.png");
});
