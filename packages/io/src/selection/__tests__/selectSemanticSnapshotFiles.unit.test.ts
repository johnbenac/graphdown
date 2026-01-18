import { describe, expect, it } from "vitest";
import { selectSemanticSnapshotFiles } from "../selectSemanticSnapshotFiles";

const encoder = new TextEncoder();

describe("selectSemanticSnapshotFiles", () => {
  it("includes blocks and Graphdown markdown while sorting ignored paths", () => {
    const entries = new Map<string, Uint8Array>([
      ["blocks/block-1.bin", new Uint8Array([1, 2, 3])],
      ["types/note.md", encoder.encode(["---", "typeId: note", "fields: {}", "---"].join("\n"))],
      [
        "records/note-one.md",
        encoder.encode(["---", "typeId: note", "recordId: one", "fields: {}", "---"].join("\n"))
      ],
      ["docs/readme.md", encoder.encode("# readme")],
      ["assets/logo.png", new Uint8Array([9, 8, 7])]
    ]);

    const result = selectSemanticSnapshotFiles(entries);

    expect(result.snapshot.files.has("blocks/block-1.bin")).toBe(true);
    expect(result.snapshot.files.has("types/note.md")).toBe(true);
    expect(result.snapshot.files.has("records/note-one.md")).toBe(true);
    expect(result.snapshot.files.has("docs/readme.md")).toBe(false);
    expect(result.ignored).toEqual(["assets/logo.png", "docs/readme.md"]);
  });
});
