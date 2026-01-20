import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { isImportError } from "@graphdown/io";
import { readZipSnapshotFromBytes } from "../readZipSnapshotFromBytes";

describe("readZipSnapshot plugin bundles", () => {
  it("includes plugin manifest and bundles via shared selection engine", () => {
    const entries: Record<string, Uint8Array> = {};
    const manifestText = [
      "---",
      "pluginId: demo",
      "gdApiVersion: 1",
      "entry: entry.js",
      "files:",
      "  - entry.js",
      "  - ui.md",
      "  - logo.png",
      "binaryFiles:",
      "  - logo.png",
      "---",
      "Demo plugin"
    ].join("\n");
    entries["plugins/demo/manifest.md"] = new Uint8Array(strToU8(manifestText));
    entries["plugins/demo/entry.js"] = new Uint8Array(strToU8("console.log('demo');"));
    entries["plugins/demo/ui.md"] = new Uint8Array(strToU8("# demo ui"));
    entries["plugins/demo/logo.png"] = new Uint8Array([0, 1, 2, 3]);
    entries["types/note.md"] = new Uint8Array(
      strToU8(["---", "typeId: note", "fields: {}", "---"].join("\n"))
    );
    entries["records/note-one.md"] = new Uint8Array(
      strToU8(["---", "typeId: note", "recordId: one", "fields: {}", "---"].join("\n"))
    );
    entries["assets/logo.png"] = new Uint8Array([9, 8, 7]);

    const zipBytes = zipSync(entries);
    const { snapshot, ignored } = readZipSnapshotFromBytes(zipBytes);

    expect(snapshot.files.has("plugins/demo/manifest.md")).toBe(true);
    expect(snapshot.files.has("plugins/demo/entry.js")).toBe(true);
    expect(snapshot.files.has("plugins/demo/ui.md")).toBe(true);
    expect(snapshot.files.has("plugins/demo/logo.png")).toBe(true);
    expect(ignored).toContain("assets/logo.png");
    expect(ignored).not.toContain("plugins/demo/entry.js");
    expect(ignored).not.toContain("plugins/demo/ui.md");
    expect(ignored).not.toContain("plugins/demo/logo.png");
  });

  it("throws a structured error when plugin bundles are missing", () => {
    const entries: Record<string, Uint8Array> = {};
    const manifestText = [
      "---",
      "pluginId: demo",
      "gdApiVersion: 1",
      "entry: entry.js",
      "files:",
      "  - entry.js",
      "  - ui.md",
      "---",
      "Demo plugin"
    ].join("\n");
    entries["plugins/demo/manifest.md"] = new Uint8Array(strToU8(manifestText));
    entries["plugins/demo/entry.js"] = new Uint8Array(strToU8("console.log('demo');"));
    entries["types/note.md"] = new Uint8Array(
      strToU8(["---", "typeId: note", "fields: {}", "---"].join("\n"))
    );

    const zipBytes = zipSync(entries);

    let caught: unknown;
    try {
      readZipSnapshotFromBytes(zipBytes);
    } catch (err) {
      caught = err;
    }

    expect(isImportError(caught)).toBe(true);
    if (isImportError(caught)) {
      expect(caught.info.source).toBe("zip");
      expect(caught.info.code).toBe("missing_files");
      expect(caught.info.missingPaths).toEqual(expect.arrayContaining(["plugins/demo/ui.md"]));
    }
  });
});
