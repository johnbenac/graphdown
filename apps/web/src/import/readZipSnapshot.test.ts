import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { readZipSnapshot } from "./readZipSnapshot";

describe("readZipSnapshot", () => {
  it("strips a shared top-level directory from GitHub-style zips", async () => {
    const zipBytes = zipSync({
      "repo-main/datasets/demo.md": strToU8("# Dataset"),
      "repo-main/types/note.md": strToU8("# Type"),
      "repo-main/records/note/record-1.md": strToU8("# Record")
    });

    const file = new File([zipBytes], "repo.zip");
    const snapshot = await readZipSnapshot(file);

    expect(snapshot.files.has("datasets/demo.md")).toBe(true);
    expect(snapshot.files.has("types/note.md")).toBe(true);
    expect(snapshot.files.has("records/note/record-1.md")).toBe(true);
  });
});
