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
          },
          {
            type: "file",
            path: "types/task.md",
            name: "task.md",
            download_url: "https://example.com/types/task.md"
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
          },
          {
            type: "dir",
            path: "records/task",
            name: "task",
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

    if (url.pathname === "/repos/owner/repo/contents/records/task") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            type: "file",
            path: "records/task/record-1.md",
            name: "record-1.md",
            download_url: "https://example.com/records/task/record-1.md"
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
          "  displayName: Note",
          "  pluralName: Notes",
          "  bodyField: content",
          "  fieldDefs:",
          "    - name: title",
          "      kind: string",
          "      label: Title",
          "      required: true",
          "    - name: estimate",
          "      kind: number",
          "      label: Estimate",
          "    - name: status",
          "      kind: enum",
          "      label: Status",
          "      options: [todo, doing, done]",
          "    - name: due",
          "      kind: date",
          "      label: Due",
          "    - name: assignee",
          "      kind: ref",
          "      label: Assignee",
          "    - name: watchers",
          "      kind: ref[]",
          "      label: Watchers",
          "    - name: content",
          "      kind: string",
          "      label: Content",
          "---"
        ].join("\n")
      });
      return;
    }
    if (url.endsWith("/types/task.md")) {
      await route.fulfill({
        status: 200,
        contentType: "text/plain",
        body: [
          "---",
          "id: type:task",
          "datasetId: dataset:demo",
          "typeId: sys:type",
          "createdAt: 2024-01-01",
          "updatedAt: 2024-01-02",
          "fields:",
          "  recordTypeId: task",
          "  pluralName: Tasks",
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
          "fields:",
          "  title: First note",
          "  status: todo",
          "  estimate: 3",
          "  due: 2024-01-10",
          "  assignee:",
          "    ref: record:task-1",
          "  watchers:",
          "    refs:",
          "      - record:task-1",
          "---",
          "Initial note body"
        ].join("\n")
      });
      return;
    }
    if (url.endsWith("/records/task/record-1.md")) {
      await route.fulfill({
        status: 200,
        contentType: "text/plain",
        body: [
          "---",
          "id: record:task-1",
          "datasetId: dataset:demo",
          "typeId: task",
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
  await expect(page).toHaveURL(/\/datasets\/note/);
  await expect(page.getByTestId("dataset-screen")).toBeVisible();
  await expect(page.getByTestId("type-nav")).toBeVisible();
  await expect(page.getByRole("link", { name: /note/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /task/i })).toBeVisible();

  await page.getByRole("button", { name: "record:1" }).click();
  await page.getByTestId("edit-record").click();
  await page.getByLabel("Title").fill("Updated note title");
  await page.getByTestId("save-record").click();
  await expect(page.getByText("Updated note title")).toBeVisible();

  await page.getByTestId("create-record").click();
  await page.getByLabel("Record ID").fill("record:new");
  await page.getByLabel("Title").fill("Brand new note");
  await page.getByTestId("save-record").click();
  await expect(page.getByRole("button", { name: "record:new" })).toBeVisible();

  await page.getByRole("link", { name: /task/i }).click();
  await expect(page).toHaveURL(/\/datasets\/task/);
  await expect(page.getByTestId("record-list")).toBeVisible();
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
