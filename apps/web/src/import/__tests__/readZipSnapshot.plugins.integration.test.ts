import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { readZipSnapshot } from "../readZipSnapshot";

describe("readZipSnapshot plugin bundles", () => {
  it("IMP-PLUG-001: includes plugin manifest and bundle files in the snapshot", async () => {
    const pluginManifest = [
      "---",
      "pluginId: demo",
      "gdApiVersion: 1",
      "entry: entry.js",
      "files:",
      "  - entry.js",
      "  - ui.md",
      "  - assets/logo.bin",
      "binaryFiles:",
      "  - assets/logo.bin",
      "---"
    ].join("\n");

    const entries: Record<string, Uint8Array> = {
      "types/note.md": new Uint8Array(strToU8("---\ntypeId: note\nfields: {}\n---")),
      "records/note/record-1.md": new Uint8Array(
        strToU8("---\ntypeId: note\nrecordId: one\nfields: {}\n---")
      ),
      "extensions/demo/plugin.md": new Uint8Array(strToU8(pluginManifest)),
      "extensions/demo/entry.js": new Uint8Array(strToU8("console.log('demo');")),
      "extensions/demo/ui.md": new Uint8Array(strToU8("# demo ui")),
      "extensions/demo/assets/logo.bin": new Uint8Array([0, 255, 1])
    };
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
    expect(snapshot.files.has("extensions/demo/assets/logo.bin")).toBe(true);
    expect(ignored).toContain("assets/logo.png");
    expect(ignored).not.toContain("extensions/demo/entry.js");
    expect(ignored).not.toContain("extensions/demo/ui.md");
    expect(ignored).not.toContain("extensions/demo/assets/logo.bin");
  });
});
