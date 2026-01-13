import { describe, expect, it } from "vitest";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { strToU8, zipSync } from "fflate";
import { readZipSnapshot } from "../readZipSnapshot";

async function collectEntries(root: string): Promise<Record<string, Uint8Array>> {
  const entries: Record<string, Uint8Array> = {};

  const walk = async (current: string) => {
    const dirents = await readdir(current, { withFileTypes: true });
    for (const dirent of dirents) {
      const fullPath = path.join(current, dirent.name);
      if (dirent.isDirectory()) {
        await walk(fullPath);
        continue;
      }
      if (!dirent.isFile()) {
        continue;
      }
      const relPath = path.relative(root, fullPath).split(path.sep).join("/");
      const bytes = await readFile(fullPath);
      entries[relPath] = new Uint8Array(bytes);
    }
  };

  await walk(root);
  return entries;
}

describe("readZipSnapshot plugin bundles", () => {
  it("IMP-PLUG-001: includes plugin manifest and bundle files in the snapshot", async () => {
    const fixturePath = path.resolve(
      process.cwd(),
      "../../packages/core/src/__fixtures__/plugin-valid-dataset"
    );
    const entries = await collectEntries(fixturePath);
    entries["docs/readme.md"] = new Uint8Array(strToU8("# readme"));

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
