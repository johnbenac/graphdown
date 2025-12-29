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

test("imports a dataset from GitHub using mocked responses", async ({ page }) => {
  const datasetContent = [
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
  ].join("\n");

  const typeContent = [
    "---",
    "id: type:note",
    "datasetId: dataset:demo",
    "typeId: sys:type",
    "createdAt: 2024-01-01",
    "updatedAt: 2024-01-02",
    "fields:",
    "  recordTypeId: note",
    "---"
  ].join("\n");

  const recordContent = [
    "---",
    "id: record:1",
    "datasetId: dataset:demo",
    "typeId: note",
    "createdAt: 2024-01-01",
    "updatedAt: 2024-01-02",
    "fields: {}",
    "---"
  ].join("\n");

  await page.route("https://api.github.com/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/repos/owner/repo") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ default_branch: "main" })
      });
    }
    if (url.pathname === "/repos/owner/repo/contents/datasets") {
      return route.fulfill({
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
    }
    if (url.pathname === "/repos/owner/repo/contents/types") {
      return route.fulfill({
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
    }
    if (url.pathname === "/repos/owner/repo/contents/records") {
      return route.fulfill({
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
    }
    if (url.pathname === "/repos/owner/repo/contents/records/note") {
      return route.fulfill({
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
    }
    return route.fulfill({ status: 404, body: "Not Found" });
  });

  await page.route("https://example.com/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/datasets/demo.md") {
      return route.fulfill({ status: 200, body: datasetContent });
    }
    if (url.pathname === "/types/note.md") {
      return route.fulfill({ status: 200, body: typeContent });
    }
    if (url.pathname === "/records/note/record-1.md") {
      return route.fulfill({ status: 200, body: recordContent });
    }
    return route.fulfill({ status: 404, body: "Not Found" });
  });

  await page.goto("/import");
  await page.fill('input[placeholder="https://github.com/owner/repo"]', "https://github.com/owner/repo");
  await page.getByRole("button", { name: "Import from GitHub" }).click();

  await expect(page.locator(".import-progress")).toBeVisible();
  await page.waitForURL("**/datasets");
  await expect(page.getByTestId("dataset-screen")).toBeVisible();
  await expect(page.getByText("Demo")).toBeVisible();
  await expect(page.getByText("Types")).toBeVisible();
});

test("shows an invalid URL error for malformed GitHub URLs", async ({ page }) => {
  await page.goto("/import");
  await page.fill('input[placeholder="https://github.com/owner/repo"]', "github.com/owner/repo");
  await page.getByRole("button", { name: "Import from GitHub" }).click();

  await expect(page.getByRole("heading", { name: "Invalid GitHub URL" })).toBeVisible();
});
