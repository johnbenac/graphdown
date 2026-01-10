import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { readZipSnapshot } from "../readZipSnapshot";

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
    const { snapshot, ignored } = await readZipSnapshot(file);

    expect(snapshot.files.has("types/note.md")).toBe(true);
    expect(snapshot.files.has("records/note/record-1.md")).toBe(true);
    expect(ignored).toEqual([]);
  });

  it("drops non-dataset files and records them as ignored", async () => {
    const zipBytes = zipSync({
      "types/note.md": new Uint8Array(strToU8("---\ntypeId: note\nfields: {}\n---")),
      "records/note/record-1.md": new Uint8Array(strToU8("---\ntypeId: note\nrecordId: one\nfields: {}\n---")),
      "docs/readme.md": new Uint8Array(strToU8("# readme")),
      "assets/logo.png": new Uint8Array([0, 1, 2])
    });

    const buffer = Uint8Array.from(zipBytes).buffer;
    const file = {
      arrayBuffer: async () => buffer
    } as File;
    const { snapshot, ignored } = await readZipSnapshot(file);

    expect(snapshot.files.has("types/note.md")).toBe(true);
    expect(snapshot.files.has("records/note/record-1.md")).toBe(true);
    expect(snapshot.files.has("docs/readme.md")).toBe(false);
    expect(ignored.sort()).toEqual(["assets/logo.png", "docs/readme.md"].sort());
  });

  it("ignores legacy blob paths entirely", async () => {
    const legacyBlobPath = `blobs/sha256/aa/${"a".repeat(64)}`;
    const zipBytes = zipSync({
      "types/note.md": new Uint8Array(strToU8("---\ntypeId: note\nfields: {}\n---")),
      "records/note/one.md": new Uint8Array(
        strToU8("---\ntypeId: note\nrecordId: one\nfields: {}\n---")
      ),
      [legacyBlobPath]: new Uint8Array([1, 2, 3]),
      "docs/readme.md": new Uint8Array(strToU8("# readme"))
    });

    const buffer = Uint8Array.from(zipBytes).buffer;
    const file = {
      arrayBuffer: async () => buffer
    } as File;
    const { snapshot, ignored } = await readZipSnapshot(file);

    expect(snapshot.files.has(legacyBlobPath)).toBe(false);
    expect(ignored.sort()).toEqual([legacyBlobPath, "docs/readme.md"].sort());
  });

  it("imports Graphdown markdown files regardless of folder layout", async () => {
    const zipBytes = zipSync({
      "random/type-location.md": new Uint8Array(
        strToU8(["---", "typeId: note", "fields: {}", "---"].join("\n"))
      ),
      "deep/nested/record-location.md": new Uint8Array(
        strToU8(["---", "typeId: note", "recordId: one", "fields: {}", "---"].join("\n"))
      ),
      "docs/readme.md": new Uint8Array(strToU8("# not a graphdown record"))
    });

    const buffer = Uint8Array.from(zipBytes).buffer;
    const file = { arrayBuffer: async () => buffer } as File;

    const { snapshot, ignored } = await readZipSnapshot(file);

    expect(snapshot.files.has("random/type-location.md")).toBe(true);
    expect(snapshot.files.has("deep/nested/record-location.md")).toBe(true);
    expect(snapshot.files.has("docs/readme.md")).toBe(false);
    expect(ignored).toContain("docs/readme.md");
  });
});
