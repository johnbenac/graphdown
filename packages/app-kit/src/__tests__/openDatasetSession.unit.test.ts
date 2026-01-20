import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DatasetSnapshot } from "@graphdown/core";
import { openDatasetSession } from "../openDatasetSession";
import { openRuntimeApiV1 } from "@graphdown/runtime";

vi.mock("@graphdown/runtime", () => ({
  openRuntimeApiV1: vi.fn()
}));

const encoder = new TextEncoder();

function snapshot(entries: Array<[string, string]>): DatasetSnapshot {
  return {
    files: new Map(entries.map(([path, text]) => [path, encoder.encode(text)]))
  };
}

describe("openDatasetSession", () => {
  beforeEach(() => {
    vi.mocked(openRuntimeApiV1).mockReset();
  });

  it("returns runtime + index on valid snapshot", async () => {
    const runtimeMock = { tag: "runtime" } as const;
    const openRuntimeApiV1Mock = vi.mocked(openRuntimeApiV1);
    openRuntimeApiV1Mock.mockResolvedValue({ ok: true, value: runtimeMock });

    const snapshotValue = snapshot([
      ["types/note.md", "---\ntypeId: note\nfields: {}\n---\n"],
      ["records/note/one.md", "---\ntypeId: note\nrecordId: one\nfields: {}\n---\n"]
    ]);

    const result = await openDatasetSession(snapshotValue);

    expect(result.ok).toBe(true);
    expect(openRuntimeApiV1Mock).toHaveBeenCalledTimes(1);
    expect(openRuntimeApiV1Mock).toHaveBeenCalledWith({ snapshot: snapshotValue });
    if (result.ok) {
      expect(result.runtimeApiV1).toBe(runtimeMock);
      expect(result.index.typeFileById.get("note")).toBe("types/note.md");
      expect(result.index.recordFileByKey.get("note:one")).toBe("records/note/one.md");
    }
  });

  it("short-circuits when validation fails", async () => {
    const openRuntimeApiV1Mock = vi.mocked(openRuntimeApiV1);
    openRuntimeApiV1Mock.mockResolvedValue({ ok: true, value: { tag: "runtime" } });

    const result = await openDatasetSession(
      snapshot([["records/note/one.md", "---\ntypeId: note\nrecordId: one\nfields: {}\n---\n"]])
    );

    expect(result.ok).toBe(false);
    expect(openRuntimeApiV1Mock).not.toHaveBeenCalled();
  });
});
