import { describe, expect, it } from "vitest";
import { zipSync } from "fflate";
import { readZipSnapshot } from "../readZipSnapshot";

describe("readZipSnapshot plugin bundles", () => {
  it("IMP-PLUG-001: includes plugin manifest and bundle files in the snapshot", async () => {
    const entries: Record<string, Uint8Array> = {};
    const encode = (value: string) => Uint8Array.from(Buffer.from(value, "utf8"));
    entries["types/note.md"] = encode(["---", "typeId: note", "fields: {}", "---", ""].join("\n"));
    entries["records/note-one.md"] = encode(
      ["---", "typeId: note", "recordId: one", "fields: {}", "---", ""].join("\n")
    );
    entries["extensions/demo/plugin.md"] = encode(
      [
        "---",
        "pluginId: demo",
        "gdApiVersion: 1",
        "entry: entry.js",
        "files:",
        "  - entry.js",
        "  - ui.md",
        "binaryFiles:",
        "  - assets/logo.bin",
        "---",
        "Demo plugin manifest"
      ].join("\n")
    );
    entries["extensions/demo/entry.js"] = encode("console.log('demo');\n");
    entries["extensions/demo/ui.md"] = encode("# Demo UI\n");
    entries["extensions/demo/assets/logo.bin"] = new Uint8Array([0, 1, 2]);
    entries["assets/logo.png"] = new Uint8Array([3, 4, 5]);

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
    expect(ignored).not.toContain("extensions/demo/assets/logo.bin");
    expect(ignored).not.toContain("extensions/demo/entry.js");
    expect(ignored).not.toContain("extensions/demo/ui.md");
  });
});
