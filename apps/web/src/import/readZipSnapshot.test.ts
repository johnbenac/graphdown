import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { readZipSnapshot } from "./readZipSnapshot";

describe("readZipSnapshot", () => {
  it("strips a single top-level folder in GitHub-style zips", async () => {
    const zipBytes = zipSync({
      "repo-main/types/note.md": new Uint8Array(strToU8("---\ntypeId: note\nfields: {}\n---")),
      "repo-main/records/note/record-1.md": new Uint8Array(
        strToU8("---\ntypeId: note\nrecordId: one\nfields: {}\n---")
      )
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

  it("imports plugins and UI config from any paths and ignores other files", async () => {
    const zipBytes = zipSync({
      "types/note.md": new Uint8Array(strToU8("---\ntypeId: note\nfields: {}\n---")),
      "records/note/record-1.md": new Uint8Array(strToU8("---\ntypeId: note\nrecordId: one\nfields: {}\n---")),
      "x/y/boolean-01/plugin.json": new Uint8Array(
        strToU8(
          JSON.stringify({
            schemaVersion: 1,
            id: "boolean-01",
            version: "1.0.0",
            provides: [{ capability: "field.view", match: { kind: "boolean" }, entry: "renderField" }]
          })
        )
      ),
      "x/y/boolean-01/plugin.js": new Uint8Array(strToU8("return { renderField() { return 'ok'; } };")),
      "x/y/boolean-01/README.md": new Uint8Array(strToU8("# plugin docs")),
      "cfg/graphdown.ui.json": new Uint8Array(
        strToU8(JSON.stringify({ schemaVersion: 1, resolutions: [{ capability: "field.view", match: {}, use: "boolean-01" }] }))
      ),
      "docs/readme.md": new Uint8Array(strToU8("# ignore me"))
    });

    const buffer = Uint8Array.from(zipBytes).buffer;
    const file = {
      arrayBuffer: async () => buffer
    } as File;
    const { snapshot, ignored } = await readZipSnapshot(file);

    expect(snapshot.files.has("x/y/boolean-01/plugin.json")).toBe(true);
    expect(snapshot.files.has("x/y/boolean-01/plugin.js")).toBe(true);
    expect(snapshot.files.has("x/y/boolean-01/README.md")).toBe(true);
    expect(snapshot.files.has("cfg/graphdown.ui.json")).toBe(true);
    expect(snapshot.files.has("docs/readme.md")).toBe(false);
    expect(ignored).toContain("docs/readme.md");
  });
});
