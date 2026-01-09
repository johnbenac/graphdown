import { describe, expect, it } from "vitest";
import type { DatasetSnapshot } from "../../graphdown";
import { buildImportReport } from "../importReport";

const encoder = new TextEncoder();

function snapshot(paths: string[]): DatasetSnapshot {
  return {
    files: new Map(paths.map((path) => [path, encoder.encode("data")]))
  };
}

describe("buildImportReport", () => {
  it("summarizes ignored files and dropped blocks with samples", () => {
    const rawSnapshot = snapshot([
      "types/note.md",
      "records/note/one.md",
      "blocks/sha2-256/aa/aablob",
      "blocks/sha2-256/bb/bbblob"
    ]);
    const canonicalSnapshot = snapshot(["types/note.md", "records/note/one.md", "blocks/sha2-256/aa/aablob"]);

    const report = buildImportReport({
      rawSnapshot,
      canonicalSnapshot,
      ignored: ["docs/readme.md", "assets/logo.png"]
    });

    expect(report.ignoredFileCount).toBe(2);
    expect(report.ignoredFileSample).toEqual(["docs/readme.md", "assets/logo.png"]);
    expect(report.droppedBlockCount).toBe(1);
    expect(report.droppedBlockSample).toEqual(["blocks/sha2-256/bb/bbblob"]);
  });

  it("handles cases with no warnings", () => {
    const rawSnapshot = snapshot(["types/note.md"]);
    const canonicalSnapshot = snapshot(["types/note.md"]);

    const report = buildImportReport({
      rawSnapshot,
      canonicalSnapshot,
      ignored: []
    });

    expect(report.ignoredFileCount).toBe(0);
    expect(report.ignoredFileSample).toEqual([]);
    expect(report.droppedBlockCount).toBe(0);
    expect(report.droppedBlockSample).toEqual([]);
  });
});
