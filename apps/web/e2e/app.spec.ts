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

test("imports a GitHub repo and navigates to datasets", async ({ page }) => {
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

  await page.route("**/api.github.com/repos/owner/repo", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ default_branch: "main" })
    });
  });

  await page.route("**/api.github.com/repos/owner/repo/contents/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    let body: unknown = [];

    if (path.endsWith("/contents/datasets")) {
      body = [
        {
          type: "file",
          path: "datasets/demo.md",
          name: "demo.md",
          download_url: "https://example.com/datasets/demo.md"
        }
      ];
    } else if (path.endsWith("/contents/types")) {
      body = [
        {
          type: "file",
          path: "types/note.md",
          name: "note.md",
          download_url: "https://example.com/types/note.md"
        }
      ];
    } else if (path.endsWith("/contents/records")) {
      body = [
        {
          type: "dir",
          path: "records/note",
          name: "note",
          download_url: null
        }
      ];
    } else if (path.endsWith("/contents/records/note")) {
      body = [
        {
          type: "file",
          path: "records/note/record-1.md",
          name: "record-1.md",
          download_url: "https://example.com/records/note/record-1.md"
        }
      ];
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body)
    });
  });

  await page.route("**/example.com/**", async (route) => {
    const url = route.request().url();
    let body = "";
    if (url.endsWith("/datasets/demo.md")) {
      body = datasetContent;
    } else if (url.endsWith("/types/note.md")) {
      body = typeContent;
    } else if (url.endsWith("/records/note/record-1.md")) {
      body = recordContent;
    }
    await route.fulfill({ status: 200, body });
  });

  await page.goto("/import");
  await page.getByLabel("GitHub URL").fill("https://github.com/owner/repo");
  await page.getByRole("button", { name: "Import from GitHub" }).click();

  await expect(page.getByText("Validating URL")).toBeVisible();
  await expect(page.getByTestId("dataset-screen")).toBeVisible();
  await expect(page.getByText("Demo")).toBeVisible();
});

test("shows an invalid URL error for malformed GitHub URLs", async ({ page }) => {
  await page.goto("/import");
  await page.getByLabel("GitHub URL").fill("github.com/owner/repo");
  await page.getByRole("button", { name: "Import from GitHub" }).click();

  await expect(page.getByText("Invalid GitHub URL")).toBeVisible();
});
