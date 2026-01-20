import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DatasetSnapshot } from "@graphdown/core";

vi.mock("@graphdown/runtime", () => ({
  openRuntimeApiV1: vi.fn()
}));

const { openRuntimeApiV1 } = await import("@graphdown/runtime");
const { openDatasetSession } = await import("../openDatasetSession");

const encoder = new TextEncoder();

function snapshotFromTextFiles(entries: Array<[string, string]>): DatasetSnapshot {
  return {
    files: new Map(entries.map(([path, text]) => [path, encoder.encode(text)]))
  };
}

describe("openDatasetSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens a runtime session and builds an index for valid snapshots", async () => {
    const runtimeMock = { close: vi.fn() };
    const runtimeMockResult = { ok: true as const, value: runtimeMock };
    const openRuntimeApiV1Mock = vi.mocked(openRuntimeApiV1);
    openRuntimeApiV1Mock.mockResolvedValue(runtimeMockResult);

    const snapshot = snapshotFromTextFiles([
      ["types/note.md", ["---", "typeId: note", "fields: {}", "---", ""].join("\n")],
      [
        "records/note/one.md",
        ["---", "typeId: note", "recordId: one", "fields: {}", "---", ""].join("\n")
      ]
    ]);

    const result = await openDatasetSession(snapshot);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(openRuntimeApiV1Mock).toHaveBeenCalledTimes(1);
    expect(openRuntimeApiV1Mock).toHaveBeenCalledWith({ snapshot });
    expect(result.index.typeFileById.get("note")).toBe("types/note.md");
    expect(result.index.recordFileByKey.get("note:one")).toBe("records/note/one.md");
  });

  it("short-circuits when snapshot validation fails", async () => {
    const openRuntimeApiV1Mock = vi.mocked(openRuntimeApiV1);
    openRuntimeApiV1Mock.mockResolvedValue({ ok: true, value: { close: vi.fn() } });

    const snapshot = snapshotFromTextFiles([
      [
        "records/note/orphan.md",
        ["---", "typeId: note", "recordId: orphan", "fields: {}", "---", ""].join("\n")
      ]
    ]);

    const result = await openDatasetSession(snapshot);

    expect(result.ok).toBe(false);
    expect(openRuntimeApiV1Mock).not.toHaveBeenCalled();
  });
});
