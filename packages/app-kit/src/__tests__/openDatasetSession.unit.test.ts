import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DatasetSnapshot } from "@graphdown/core";
import type { RuntimeApiV1 } from "@graphdown/runtime";
import { openRuntimeApiV1 } from "@graphdown/runtime";
import { openDatasetSession } from "../openDatasetSession";

vi.mock("@graphdown/runtime", async () => {
  const actual = await vi.importActual<typeof import("@graphdown/runtime")>("@graphdown/runtime");
  return {
    ...actual,
    openRuntimeApiV1: vi.fn()
  };
});

const encoder = new TextEncoder();

function snapshot(files: Record<string, string>): DatasetSnapshot {
  return {
    files: new Map(Object.entries(files).map(([path, text]) => [path, encoder.encode(text)]))
  };
}

function frontMatter(lines: string[]): string {
  return ["---", ...lines, "---", ""].join("\n");
}

describe("openDatasetSession", () => {
  const openRuntimeApiV1Mock = vi.mocked(openRuntimeApiV1);

  beforeEach(() => {
    openRuntimeApiV1Mock.mockReset();
  });

  it("opens runtime and returns index for valid snapshots", async () => {
    const recordText = frontMatter(["typeId: note", "recordId: one", "fields:", "  title: Hello"]);
    const typeText = frontMatter(["typeId: note", "fields:", "  title:", "    type: text"]);

    const datasetSnapshot = snapshot({
      "types/note.md": typeText,
      "records/note/one.md": recordText
    });

    const runtimeMock = {} as RuntimeApiV1;
    openRuntimeApiV1Mock.mockResolvedValue({ ok: true, value: runtimeMock });

    const result = await openDatasetSession(datasetSnapshot);

    expect(result.ok).toBe(true);
    expect(openRuntimeApiV1Mock).toHaveBeenCalledTimes(1);
    expect(openRuntimeApiV1Mock).toHaveBeenCalledWith({ snapshot: datasetSnapshot });

    if (result.ok) {
      expect(result.index.typeFileById.get("note")).toBe("types/note.md");
      expect(result.index.recordFileByKey.get("note:one")).toBe("records/note/one.md");
    }
  });

  it("short-circuits runtime when validation fails", async () => {
    const recordText = frontMatter(["typeId: note", "recordId: one", "fields:", "  title: Hello"]);
    const datasetSnapshot = snapshot({
      "records/note/one.md": recordText
    });

    const result = await openDatasetSession(datasetSnapshot);

    expect(result.ok).toBe(false);
    expect(openRuntimeApiV1Mock).not.toHaveBeenCalled();
  });
});
