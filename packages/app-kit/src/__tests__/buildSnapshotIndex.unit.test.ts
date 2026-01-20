import { describe, expect, it } from "vitest";
import type { DatasetSnapshot } from "@graphdown/core";
import { buildSnapshotIndex } from "../buildSnapshotIndex";

const encoder = new TextEncoder();

function snapshot(files: Array<[string, string]>): DatasetSnapshot {
  return {
    files: new Map(files.map(([path, contents]) => [path, encoder.encode(contents)]))
  };
}

describe("buildSnapshotIndex", () => {
  it("ignores plugin bundle files", () => {
    const result = buildSnapshotIndex(
      snapshot([
        ["types/note.md", ["---", "typeId: note", "---", ""].join("\n")],
        [
          "records/note/one.md",
          ["---", "typeId: note", "recordId: one", "---", ""].join("\n")
        ],
        [
          "extensions/demo/plugin.md",
          [
            "---",
            "pluginId: demo",
            "gdApiVersion: 1",
            "files:",
            "  - recordlike.md",
            "---",
            ""
          ].join("\n")
        ],
        [
          "extensions/demo/recordlike.md",
          ["---", "typeId: note", "recordId: one", "---", ""].join("\n")
        ]
      ])
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.index.recordFileByKey.get("note:one")).toBe("records/note/one.md");
  });

  it("reports duplicate record ids when no plugin skip applies", () => {
    const result = buildSnapshotIndex(
      snapshot([
        ["types/note.md", ["---", "typeId: note", "---", ""].join("\n")],
        [
          "records/note/one.md",
          ["---", "typeId: note", "recordId: one", "---", ""].join("\n")
        ],
        [
          "records/note/duplicate.md",
          ["---", "typeId: note", "recordId: one", "---", ""].join("\n")
        ]
      ])
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.errors.some((error) => error.code === "E_DUPLICATE_ID")).toBe(true);
  });
});
