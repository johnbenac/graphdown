import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { readZipSnapshot } from "../readZipSnapshot";

describe("readZipSnapshot plugin bundles", () => {
  it("IMP-PLUG-001: includes plugin manifest and bundle files in the snapshot", async () => {
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
    entries["extensions/demo/plugin.md"] = new Uint8Array(strToU8(manifestText));
    entries["extensions/demo/entry.js"] = new Uint8Array(strToU8("console.log('demo');"));
    entries["extensions/demo/ui.md"] = new Uint8Array(strToU8("# demo ui"));
    entries["extensions/demo/logo.png"] = new Uint8Array([0, 1, 2, 3]);
    entries["types/note.md"] = new Uint8Array(
      strToU8(["---", "typeId: note", "fields: {}", "---"].join("\n"))
    );
    entries["records/note-one.md"] = new Uint8Array(
      strToU8(["---", "typeId: note", "recordId: one", "fields: {}", "---"].join("\n"))
    );
    entries["assets/logo.png"] = new Uint8Array([9, 8, 7]);

    const zipBytes = zipSync(entries);
    const buffer = zipBytes.buffer.slice(zipBytes.byteOffset, zipBytes.byteOffset + zipBytes.byteLength);
    const file = {
      arrayBuffer: async () => buffer
    } as File;

    const { snapshot, ignored } = await readZipSnapshot(file);

    expect(snapshot.files.has("extensions/demo/plugin.md")).toBe(true);
    expect(snapshot.files.has("extensions/demo/entry.js")).toBe(true);
    expect(snapshot.files.has("extensions/demo/ui.md")).toBe(true);
    expect(snapshot.files.has("extensions/demo/logo.png")).toBe(true);
    expect(ignored).toContain("assets/logo.png");
    expect(ignored).not.toContain("extensions/demo/entry.js");
    expect(ignored).not.toContain("extensions/demo/ui.md");
    expect(ignored).not.toContain("extensions/demo/logo.png");
  });
});
