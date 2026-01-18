import { describe, expect, it } from "vitest";

import { selectSemanticSnapshotFiles } from "../selectSemanticSnapshotFiles";

const encoder = new TextEncoder();

describe("selectSemanticSnapshotFiles", () => {
  it("includes blocks and graphdown markdown by content, ignores non-semantic files", () => {
    const entries = new Map<string, Uint8Array>([
      ["blocks/block.json", encoder.encode("{}")],
      [
        "misc/record.md",
        encoder.encode(["---", "typeId: note", "recordId: one", "fields: {}", "---"].join("\n"))
      ],
      [
        "types/note.md",
        encoder.encode(["---", "typeId: note", "fields: {}", "---"].join("\n"))
      ],
      ["docs/readme.md", encoder.encode("# plain markdown")],
      ["assets/blob.bin", new Uint8Array([1, 2, 3])]
    ]);

    const result = selectSemanticSnapshotFiles(entries);

    expect(result.snapshot.files.has("blocks/block.json")).toBe(true);
    expect(result.snapshot.files.has("misc/record.md")).toBe(true);
    expect(result.snapshot.files.has("types/note.md")).toBe(true);
    expect(result.snapshot.files.has("docs/readme.md")).toBe(false);
    expect(result.snapshot.files.has("assets/blob.bin")).toBe(false);
    expect(result.ignored).toEqual(["assets/blob.bin", "docs/readme.md"]);
  });
});
