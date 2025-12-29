import { strToU8, unzipSync, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { readZipSnapshot } from "./readZipSnapshot";

describe("readZipSnapshot", () => {
  it("strips a common top-level folder", async () => {
    const toBuffer = (text: string) => {
      const data = strToU8(text);
      return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    };

    const zipBytes = zipSync({
      "repo-main/datasets/demo.md": toBuffer("demo"),
      "repo-main/types/note.md": toBuffer("type"),
      "repo-main/records/note/record-1.md": toBuffer("record")
    });

    expect(zipBytes.length).toBeGreaterThan(0);
    const directEntries = unzipSync(zipBytes);
    const directKeys = Object.keys(directEntries)
      .map((key) => key.replace(/\/+$/, ""))
      .sort();
    expect(directKeys).toEqual([
      "repo-main/datasets/demo.md",
      "repo-main/records/note/record-1.md",
      "repo-main/types/note.md"
    ]);

    const snapshot = await readZipSnapshot(zipBytes);

    const keys = [...snapshot.files.keys()].sort();
    expect(keys).toEqual([
      "datasets/demo.md",
      "records/note/record-1.md",
      "types/note.md"
    ]);
  });
});
