import { describe, expect, it } from "vitest";
import { zipSync } from "fflate";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readZipSnapshot } from "../readZipSnapshot";

async function collectEntries(rootDir: string, currentDir = rootDir) {
  const entries: Record<string, Uint8Array> = {};
  const dirents = await readdir(currentDir, { withFileTypes: true });
  for (const dirent of dirents) {
    const absolutePath = path.join(currentDir, dirent.name);
    if (dirent.isDirectory()) {
      const nestedEntries = await collectEntries(rootDir, absolutePath);
      for (const [entryPath, bytes] of Object.entries(nestedEntries)) {
        entries[entryPath] = bytes;
      }
      continue;
    }
    if (!dirent.isFile()) {
      continue;
    }
    const relativePath = path.relative(rootDir, absolutePath).split(path.sep).join("/");
    const buffer = await readFile(absolutePath);
    entries[relativePath] = new Uint8Array(buffer);
  }
  return entries;
}

describe("readZipSnapshot plugin bundles", () => {
  it("IMP-PLUG-001: includes plugin manifest and bundle files in the snapshot", async () => {
    const fixtureRoot = new URL(
      "../../../../../packages/core/src/__fixtures__/plugin-valid-dataset/",
      import.meta.url
    );
    const fixturePath =
      fixtureRoot.protocol === "file:"
        ? fileURLToPath(fixtureRoot)
        : path.resolve(
            process.cwd(),
            "..",
            "..",
            "packages/core/src/__fixtures__/plugin-valid-dataset"
          );
    const entries = await collectEntries(fixturePath);
    entries["docs/readme.md"] = new Uint8Array(Buffer.from("# readme"));

    const zipBytes = zipSync(entries);
    const buffer = Uint8Array.from(zipBytes).buffer;
    const file = {
      arrayBuffer: async () => buffer
    } as File;

    const { snapshot, ignored } = await readZipSnapshot(file);

    expect(snapshot.files.has("extensions/demo/plugin.md")).toBe(true);
    expect(snapshot.files.has("extensions/demo/entry.js")).toBe(true);
    expect(snapshot.files.has("extensions/demo/ui.md")).toBe(true);
    expect(ignored).toContain("docs/readme.md");
    expect(ignored).not.toContain("extensions/demo/entry.js");
    expect(ignored).not.toContain("extensions/demo/ui.md");
  });
});
