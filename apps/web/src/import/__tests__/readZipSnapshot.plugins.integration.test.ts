import { describe, expect, it } from "vitest";
import { zipSync } from "fflate";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readZipSnapshot } from "../readZipSnapshot";

async function collectEntries(dir: string, rootDir: string, entries: Record<string, Uint8Array>) {
  const contents = await readdir(dir, { withFileTypes: true });
  for (const entry of contents) {
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectEntries(absolutePath, rootDir, entries);
      continue;
    }
    const bytes = await readFile(absolutePath);
    const relativePath = path.relative(rootDir, absolutePath).split(path.sep).join("/");
    entries[relativePath] = new Uint8Array(bytes);
  }
}

describe("readZipSnapshot plugin bundles", () => {
  it("IMP-PLUG-001: includes plugin manifest and bundle files in the snapshot", async () => {
    const testDir = path.dirname(fileURLToPath(import.meta.url));
    const fixtureRoot = path.resolve(
      testDir,
      "../../../../../packages/core/src/__fixtures__/plugin-valid-dataset/"
    );
    const entries: Record<string, Uint8Array> = {};
    await collectEntries(fixtureRoot, fixtureRoot, entries);
    entries["assets/logo.png"] = new Uint8Array([0, 1, 2]);

    const zipBytes = zipSync(entries);
    const buffer = Uint8Array.from(zipBytes).buffer;
    const file = {
      arrayBuffer: async () => buffer
    } as File;

    const { snapshot, ignored } = await readZipSnapshot(file);

    expect(snapshot.files.has("extensions/demo/plugin.md")).toBe(true);
    expect(snapshot.files.has("extensions/demo/entry.js")).toBe(true);
    expect(snapshot.files.has("extensions/demo/ui.md")).toBe(true);
    expect(ignored).toContain("assets/logo.png");
    expect(ignored).not.toContain("extensions/demo/entry.js");
    expect(ignored).not.toContain("extensions/demo/ui.md");
  });
});
