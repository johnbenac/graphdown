import { describe, expect, it, vi } from "vitest";

vi.mock("fflate", () => ({
  unzipSync: () => ({
    "repo-main/datasets/demo.md": new Uint8Array([1]),
    "repo-main/types/note.md": new Uint8Array([2]),
    "repo-main/records/note/record-1.md": new Uint8Array([3])
  })
}));

describe("readZipSnapshot", () => {
  it("strips a common root folder from GitHub zip layouts", async () => {
    const { readZipSnapshot } = await import("./readZipSnapshot");
    const file = {
      arrayBuffer: async () => new ArrayBuffer(1)
    } as File;
    const snapshot = await readZipSnapshot(file);
    expect([...snapshot.files.keys()].sort()).toEqual(
      ["datasets/demo.md", "records/note/record-1.md", "types/note.md"].sort()
    );
  });
});
