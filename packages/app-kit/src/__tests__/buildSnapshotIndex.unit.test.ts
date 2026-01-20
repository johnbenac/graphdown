import { describe, expect, it } from "vitest";
import type { DatasetSnapshot } from "@graphdown/core";
import { buildSnapshotIndex } from "../buildSnapshotIndex";

const encoder = new TextEncoder();

function snapshotFromTextFiles(entries: Array<[string, string]>): DatasetSnapshot {
  return {
    files: new Map(entries.map(([path, text]) => [path, encoder.encode(text)]))
  };
}

describe("buildSnapshotIndex", () => {
  it("ignores plugin bundle files that look like records", () => {
    const snapshot = snapshotFromTextFiles([
      ["types/note.md", ["---", "typeId: note", "---", ""].join("\n")],
      [
        "records/note/one.md",
        ["---", "typeId: note", "recordId: one", "---", "Real record"].join("\n")
      ],
      [
        "extensions/demo/plugin.md",
        [
          "---",
          "pluginId: demo",
          "gdApiVersion: 1",
          "entry: entry.js",
          "files:",
          "  - entry.js",
          "  - recordlike.md",
          "---",
          ""
        ].join("\n")
      ],
      ["extensions/demo/entry.js", "export function activate() {}"],
      [
        "extensions/demo/recordlike.md",
        ["---", "typeId: note", "recordId: one", "---", "Bundle record"].join("\n")
      ]
    ]);

    const result = buildSnapshotIndex(snapshot);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.index.recordFileByKey.get("note:one")).toBe("records/note/one.md");
  });

  it("reports duplicate record identities when no plugin manifest is present", () => {
    const snapshot = snapshotFromTextFiles([
      ["types/note.md", ["---", "typeId: note", "---", ""].join("\n")],
      [
        "records/note/one.md",
        ["---", "typeId: note", "recordId: one", "---", "First record"].join("\n")
      ],
      [
        "records/note/one-duplicate.md",
        ["---", "typeId: note", "recordId: one", "---", "Duplicate record"].join("\n")
      ]
    ]);

    const result = buildSnapshotIndex(snapshot);

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.errors.some((error) => error.code === "E_DUPLICATE_ID")).toBe(true);
  });
});
