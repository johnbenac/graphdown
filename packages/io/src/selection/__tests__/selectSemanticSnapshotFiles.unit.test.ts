import { describe, expect, it } from "vitest";

import { selectSemanticSnapshotFiles } from "../selectSemanticSnapshotFiles";

const bytes = (text: string) => new TextEncoder().encode(text);

describe("selectSemanticSnapshotFiles", () => {
  it("includes blocks and Graphdown markdown while ignoring ordinary markdown", () => {
    const entries = new Map<string, Uint8Array>([
      ["blocks/blob.bin", new Uint8Array([1, 2, 3])],
      [
        "docs/record.md",
        bytes(["---", "typeId: note", "recordId: one", "fields: {}", "---"].join("\n"))
      ],
      ["docs/readme.md", bytes("# readme")],
      ["notes.txt", bytes("plain text")]
    ]);

    const result = selectSemanticSnapshotFiles(entries);

    expect(result.snapshot.files.has("blocks/blob.bin")).toBe(true);
    expect(result.snapshot.files.has("docs/record.md")).toBe(true);
    expect(result.snapshot.files.has("docs/readme.md")).toBe(false);
    expect(result.snapshot.files.has("notes.txt")).toBe(false);
    expect(result.ignored).toEqual(["docs/readme.md", "notes.txt"]);
  });
});
