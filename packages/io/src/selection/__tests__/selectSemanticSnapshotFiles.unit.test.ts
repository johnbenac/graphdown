import { describe, expect, it } from "vitest";

import { selectSemanticSnapshotFiles } from "../selectSemanticSnapshotFiles";

const encoder = new TextEncoder();
const bytes = (text: string) => encoder.encode(text);

describe("selectSemanticSnapshotFiles", () => {
  it("includes blocks and Graphdown markdown by bytes regardless of path", () => {
    const entries = new Map<string, Uint8Array>([
      ["docs/readme.md", bytes("# docs")],
      ["blocks/graph.md", bytes("# block")],
      [
        "misc/record.md",
        bytes(["---", "typeId: note", "recordId: one", "fields: {}", "---"].join("\n"))
      ],
      ["assets/alpha.bin", new Uint8Array([1, 2, 3])]
    ]);

    const result = selectSemanticSnapshotFiles(entries);

    expect(result.snapshot.files.has("blocks/graph.md")).toBe(true);
    expect(result.snapshot.files.has("misc/record.md")).toBe(true);
    expect(result.snapshot.files.has("docs/readme.md")).toBe(false);
    expect(result.ignored).toEqual(["assets/alpha.bin", "docs/readme.md"]);
  });
});
