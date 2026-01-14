import { describe, expect, it } from "vitest";
import { zipSync } from "fflate";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildDatasetZipBytes, canonicalizeDatasetSnapshot } from "@graphdown/core";
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

  it("IMP-PLUG-001: preserves binary plugin bundle bytes on export/import", async () => {
    const encoder = new TextEncoder();
    const toBytes = (value: string): Uint8Array => Uint8Array.from(encoder.encode(value));
    const manifest = [
      "---",
      "pluginId: demo",
      "gdApiVersion: 1",
      "entry: entry.js",
      "files:",
      "  - entry.js",
      "  - assets/logo.bin",
      "binaryFiles:",
      "  - assets/logo.bin",
      "---",
      ""
    ].join("\n");
    const binaryBytes = new Uint8Array([0xff, 0xd8, 0xff, 0x00, 0x80]);

    const snapshot = {
      files: new Map<string, Uint8Array>([
        ["types/note.md", toBytes(["---", "typeId: note", "fields: {}", "---"].join("\n"))],
        ["extensions/demo/plugin.md", toBytes(manifest)],
        ["extensions/demo/entry.js", toBytes("console.log('entry');")],
        ["extensions/demo/assets/logo.bin", binaryBytes]
      ])
    };

    const canonical = canonicalizeDatasetSnapshot(snapshot);
    const zipBytes = buildDatasetZipBytes(canonical);
    const file = {
      arrayBuffer: async () => Uint8Array.from(zipBytes).buffer
    } as File;

    const { snapshot: imported } = await readZipSnapshot(file);

    expect(imported.files.get("plugins/demo/assets/logo.bin")).toEqual(binaryBytes);
  });
});
