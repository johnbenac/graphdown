import { describe, expect, it } from "vitest";
import type { DatasetSnapshot } from "@graphdown/dataset";
import { buildSnapshotIndex } from "../buildSnapshotIndex";

const encoder = new TextEncoder();

function snapshot(entries: Array<[string, string]>): DatasetSnapshot {
  return {
    files: new Map(entries.map(([path, text]) => [path, encoder.encode(text)]))
  };
}

describe("buildSnapshotIndex", () => {
  it("ignores plugin bundles when indexing records", () => {
    const result = buildSnapshotIndex(
      snapshot([
        ["types/note.md", "---\ntypeId: note\n---\n"],
        ["records/note/one.md", "---\ntypeId: note\nrecordId: one\n---\n"],
        [
          "plugins/demo/manifest.md",
          "---\npluginId: demo\nfiles:\n  - recordlike.md\n---\n"
        ],
        ["plugins/demo/recordlike.md", "---\ntypeId: note\nrecordId: one\n---\n"]
      ])
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.index.recordFileByKey.get("note:one")).toBe("records/note/one.md");
    }
  });

  it("reports duplicates when records collide", () => {
    const result = buildSnapshotIndex(
      snapshot([
        ["records/note/one.md", "---\ntypeId: note\nrecordId: one\n---\n"],
        ["records/note/one-copy.md", "---\ntypeId: note\nrecordId: one\n---\n"]
      ])
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((error) => error.code === "E_DUPLICATE_ID")).toBe(true);
    }
  });
});
