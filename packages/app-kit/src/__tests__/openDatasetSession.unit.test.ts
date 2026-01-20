import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DatasetSnapshot } from "@graphdown/core";
import type { RuntimeApiV1 } from "@graphdown/runtime";
import { openRuntimeApiV1 } from "@graphdown/runtime";
import { openDatasetSession } from "../openDatasetSession";

vi.mock("@graphdown/runtime", () => ({
  openRuntimeApiV1: vi.fn()
}));

const encoder = new TextEncoder();

function snapshot(files: Array<[string, string]>): DatasetSnapshot {
  return {
    files: new Map(files.map(([path, contents]) => [path, encoder.encode(contents)]))
  };
}

describe("openDatasetSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens runtime and indexes a valid snapshot", async () => {
    const runtimeMock = {} as RuntimeApiV1;
    vi.mocked(openRuntimeApiV1).mockResolvedValueOnce({ ok: true, value: runtimeMock });

    const validSnapshot = snapshot([
      ["types/note.md", ["---", "typeId: note", "fields: {}", "---", ""].join("\n")],
      [
        "records/note/one.md",
        ["---", "typeId: note", "recordId: one", "fields: {}", "---", ""].join("\n")
      ]
    ]);

    const result = await openDatasetSession(validSnapshot);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(openRuntimeApiV1).toHaveBeenCalledTimes(1);
    expect(openRuntimeApiV1).toHaveBeenCalledWith({ snapshot: validSnapshot });
    expect(result.index.typeFileById.get("note")).toBe("types/note.md");
    expect(result.index.recordFileByKey.get("note:one")).toBe("records/note/one.md");
  });

  it("short-circuits runtime when validation fails", async () => {
    const invalidSnapshot = snapshot([
      [
        "records/note/one.md",
        ["---", "typeId: note", "recordId: one", "fields: {}", "---", ""].join("\n")
      ]
    ]);

    const result = await openDatasetSession(invalidSnapshot);

    expect(result.ok).toBe(false);
    expect(openRuntimeApiV1).not.toHaveBeenCalled();
  });
});
