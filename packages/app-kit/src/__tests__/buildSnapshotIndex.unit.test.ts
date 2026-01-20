import { describe, expect, it } from "vitest";
import type { DatasetSnapshot } from "@graphdown/core";
import { buildSnapshotIndex } from "../buildSnapshotIndex";

const encoder = new TextEncoder();

function snapshot(files: Record<string, string>): DatasetSnapshot {
  return {
    files: new Map(Object.entries(files).map(([path, text]) => [path, encoder.encode(text)]))
  };
}

function frontMatter(lines: string[]): string {
  return ["---", ...lines, "---", ""].join("\n");
}

describe("buildSnapshotIndex", () => {
  it("ignores plugin bundle files", () => {
    const recordText = frontMatter(["typeId: note", "recordId: one", "fields:", "  title: Hello"]);
    const manifestText = frontMatter([
      "pluginId: demo",
      "gdApiVersion: 1",
      "files:",
      "  - recordlike.md"
    ]);

    const result = buildSnapshotIndex(
      snapshot({
        "records/note/one.md": recordText,
        "extensions/demo/plugin.md": manifestText,
        "extensions/demo/recordlike.md": recordText
      })
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.index.recordFileByKey.get("note:one")).toBe("records/note/one.md");
      expect(result.index.recordFileByKey.size).toBe(1);
    }
  });

  it("reports duplicate records when no plugin bundle excludes them", () => {
    const recordText = frontMatter(["typeId: note", "recordId: one", "fields:", "  title: Hello"]);

    const result = buildSnapshotIndex(
      snapshot({
        "records/note/one.md": recordText,
        "records/note/one-copy.md": recordText
      })
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((error) => error.code === "E_DUPLICATE_ID")).toBe(true);
    }
  });
});
