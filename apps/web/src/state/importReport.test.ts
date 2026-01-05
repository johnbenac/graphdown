import { describe, expect, it } from "vitest";
import type { DatasetSnapshot } from "../core/snapshotTypes";
import { buildImportReport } from "./importReport";

const encoder = new TextEncoder();

function snapshot(paths: string[]): DatasetSnapshot {
  return {
    files: new Map(paths.map((path) => [path, encoder.encode("data")]))
  };
}

describe("buildImportReport", () => {
  it("summarizes ignored files and dropped blobs with samples", () => {
    const rawSnapshot = snapshot([
      "types/note.md",
      "records/note/one.md",
      "blobs/sha256/aa/aablob",
      "blobs/sha256/bb/bbblob"
    ]);
    const canonicalSnapshot = snapshot(["types/note.md", "records/note/one.md", "blobs/sha256/aa/aablob"]);

    const report = buildImportReport({
      rawSnapshot,
      canonicalSnapshot,
      ignored: ["docs/readme.md", "assets/logo.png"],
      pluginWarnings: [{ message: "Plugin warning A" }, { message: "Plugin warning B" }]
    });

    expect(report.ignoredFileCount).toBe(2);
    expect(report.ignoredFileSample).toEqual(["docs/readme.md", "assets/logo.png"]);
    expect(report.droppedBlobCount).toBe(1);
    expect(report.droppedBlobSample).toEqual(["blobs/sha256/bb/bbblob"]);
    expect(report.pluginWarningCount).toBe(2);
    expect(report.pluginWarningSample).toEqual(["Plugin warning A", "Plugin warning B"]);
  });

  it("handles cases with no warnings", () => {
    const rawSnapshot = snapshot(["types/note.md"]);
    const canonicalSnapshot = snapshot(["types/note.md"]);

    const report = buildImportReport({
      rawSnapshot,
      canonicalSnapshot,
      ignored: [],
      pluginWarnings: []
    });

    expect(report.ignoredFileCount).toBe(0);
    expect(report.ignoredFileSample).toEqual([]);
    expect(report.droppedBlobCount).toBe(0);
    expect(report.droppedBlobSample).toEqual([]);
    expect(report.pluginWarningCount).toBe(0);
    expect(report.pluginWarningSample).toEqual([]);
  });
});
