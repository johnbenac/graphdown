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

test("imports a GitHub repo with mocked responses", async ({ page }) => {
  await page.route("**/api.github.com/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/repos/owner/repo") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ default_branch: "main" })
      });
      return;
    }

    if (url.pathname === "/repos/owner/repo/contents/datasets") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            type: "file",
            path: "datasets/demo.md",
            name: "demo.md",
            download_url: "https://example.com/datasets/demo.md"
          }
        ])
      });
      return;
    }

    if (url.pathname === "/repos/owner/repo/contents/types") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            type: "file",
            path: "types/note.md",
            name: "note.md",
            download_url: "https://example.com/types/note.md"
          }
        ])
      });
      return;
    }

    if (url.pathname === "/repos/owner/repo/contents/records") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            type: "dir",
            path: "records/note",
            name: "note",
            download_url: null
          }
        ])
      });
      return;
    }

    if (url.pathname === "/repos/owner/repo/contents/records/note") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            type: "file",
            path: "records/note/record-1.md",
            name: "record-1.md",
            download_url: "https://example.com/records/note/record-1.md"
          }
        ])
      });
      return;
    }

    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ message: "Not Found" })
    });
  });

  await page.route("**/example.com/**", async (route) => {
    const url = route.request().url();
    if (url.endsWith("/datasets/demo.md")) {
      await route.fulfill({
        status: 200,
        contentType: "text/plain",
        body: [
          "---",
          "id: dataset:demo",
          "datasetId: dataset:demo",
          "typeId: sys:dataset",
          "createdAt: 2024-01-01",
          "updatedAt: 2024-01-02",
          "fields:",
          "  name: Demo",
          "  description: Demo dataset",
          "---"
        ].join("\n")
      });
      return;
    }
    if (url.endsWith("/types/note.md")) {
      await route.fulfill({
        status: 200,
        contentType: "text/plain",
        body: [
          "---",
          "id: type:note",
          "datasetId: dataset:demo",
          "typeId: sys:type",
          "createdAt: 2024-01-01",
          "updatedAt: 2024-01-02",
          "fields:",
          "  recordTypeId: note",
          "---"
        ].join("\n")
      });
      return;
    }
    if (url.endsWith("/records/note/record-1.md")) {
      await route.fulfill({
        status: 200,
        contentType: "text/plain",
        body: [
          "---",
          "id: record:1",
          "datasetId: dataset:demo",
          "typeId: note",
          "createdAt: 2024-01-01",
          "updatedAt: 2024-01-02",
          "fields: {}",
          "---"
        ].join("\n")
      });
      return;
    }

    await route.fulfill({ status: 404 });
  });

  await page.goto("/import?storage=memory");
  await page.getByLabel("GitHub URL").fill("https://github.com/owner/repo");
  await page.getByRole("button", { name: "Import from GitHub" }).click();

  await expect(page.locator(".import-progress")).toBeVisible();
  await expect(page).toHaveURL(/\/datasets/);
  await expect(page.getByTestId("dataset-screen")).toBeVisible();
});

test("shows an invalid URL error for malformed GitHub URLs", async ({ page }) => {
  await page.goto("/import?storage=memory");
  await page.getByLabel("GitHub URL").fill("github.com/owner/repo");
  await page.getByRole("button", { name: "Import from GitHub" }).click();

  await expect(page.getByRole("heading", { name: "Invalid GitHub URL" })).toBeVisible();
  await expect(
    page.getByText("GitHub URL must include the full https://github.com/owner/repo format.")
  ).toBeVisible();
});
