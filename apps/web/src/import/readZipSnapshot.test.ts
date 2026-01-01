import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { readZipSnapshot } from "./readZipSnapshot";

describe("readZipSnapshot", () => {
  it("strips a single top-level folder in GitHub-style zips", async () => {
    const zipBytes = zipSync({
      "repo-main/types/note.md": new Uint8Array(strToU8("---\nid: type:note\n---")),
      "repo-main/records/note/record-1.md": new Uint8Array(strToU8("---\nid: record:1\n---"))
    });

    const buffer = Uint8Array.from(zipBytes).buffer;
    const file = {
      arrayBuffer: async () => buffer
    } as File;
    const snapshot = await readZipSnapshot(file);

    expect(snapshot.files.has("types/note.md")).toBe(true);
    expect(snapshot.files.has("records/note/record-1.md")).toBe(true);
  });
});
