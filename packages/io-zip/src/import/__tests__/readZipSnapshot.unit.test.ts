import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { readZipSnapshotFromBytes } from "../readZipSnapshotFromBytes";

const bytes = (value: string) => new Uint8Array(strToU8(value));

describe("readZipSnapshotFromBytes", () => {
  it("strips a single top-level folder in GitHub-style zips", () => {
    const zipBytes = zipSync({
      "repo-main/types/note.md": bytes("---\nid: type:note\n---"),
      "repo-main/records/note/record-1.md": bytes("---\nid: record:1\n---")
    });

    const { snapshot, ignored } = readZipSnapshotFromBytes(zipBytes);

    expect(snapshot.files.has("types/note.md")).toBe(true);
    expect(snapshot.files.has("records/note/record-1.md")).toBe(true);
    expect(ignored).toEqual([]);
  });

  it("drops non-dataset files and records them as ignored", () => {
    const zipBytes = zipSync({
      "types/note.md": bytes("---\ntypeId: note\nfields: {}\n---"),
      "records/note/record-1.md": bytes("---\ntypeId: note\nrecordId: one\nfields: {}\n---"),
      "docs/readme.md": bytes("# readme"),
      "assets/logo.png": new Uint8Array([0, 1, 2])
    });

    const { snapshot, ignored } = readZipSnapshotFromBytes(zipBytes);

    expect(snapshot.files.has("types/note.md")).toBe(true);
    expect(snapshot.files.has("records/note/record-1.md")).toBe(true);
    expect(snapshot.files.has("docs/readme.md")).toBe(false);
    expect(ignored).toEqual(["assets/logo.png", "docs/readme.md"]);
  });

  it("imports Graphdown markdown files regardless of folder layout", () => {
    const zipBytes = zipSync({
      "random/type-location.md": bytes(["---", "typeId: note", "fields: {}", "---"].join("\n")),
      "deep/nested/record-location.md": bytes(
        ["---", "typeId: note", "recordId: one", "fields: {}", "---"].join("\n")
      ),
      "docs/readme.md": bytes("# not a graphdown record")
    });

    const { snapshot, ignored } = readZipSnapshotFromBytes(zipBytes);

    expect(snapshot.files.has("random/type-location.md")).toBe(true);
    expect(snapshot.files.has("deep/nested/record-location.md")).toBe(true);
    expect(snapshot.files.has("docs/readme.md")).toBe(false);
    expect(ignored).toContain("docs/readme.md");
  });

  it("ignores non-semantic files that are not declared by plugins", () => {
    const zipBytes = zipSync({
      "types/note.md": bytes("---\ntypeId: note\nfields: {}\n---"),
      "records/note/one.md": bytes("---\ntypeId: note\nrecordId: one\nfields: {}\n---"),
      "assets/extra.bin": new Uint8Array([1, 2, 3]),
      "docs/readme.md": bytes("# readme")
    });

    const { snapshot, ignored } = readZipSnapshotFromBytes(zipBytes);

    expect(snapshot.files.has("assets/extra.bin")).toBe(false);
    expect(ignored).toEqual(["assets/extra.bin", "docs/readme.md"]);
  });

  it("throws on path normalization collisions", () => {
    const zipBytes = zipSync({
      "a/b.txt": bytes("first"),
      "a\\b.txt": bytes("second")
    });

    expect(() => readZipSnapshotFromBytes(zipBytes)).toThrow(/collision/);
  });

  it("throws when a plugin manifest cannot be parsed", () => {
    const manifestText = [
      "---",
      "pluginId: demo",
      "gdApiVersion: 1",
      "entry: entry.js",
      "files:",
      "  - entry.js"
    ].join("\n");

    const zipBytes = zipSync({
      "extensions/demo/plugin.md": bytes(manifestText)
    });

    expect(() => readZipSnapshotFromBytes(zipBytes)).toThrow(
      /Plugin manifest demo\/plugin\.md failed to parse/
    );
  });

  it("throws when declared plugin bundle files are missing", () => {
    const manifestText = [
      "---",
      "pluginId: demo",
      "gdApiVersion: 1",
      "entry: entry.js",
      "files:",
      "  - entry.js",
      "---",
      "Demo plugin"
    ].join("\n");

    const zipBytes = zipSync({
      "extensions/demo/plugin.md": bytes(manifestText)
    });

    expect(() => readZipSnapshotFromBytes(zipBytes)).toThrow(
      /Missing plugin bundle files: demo\/entry\.js/
    );
  });

  it("returns ignored entries in deterministic order", () => {
    const zipBytes = zipSync({
      "z/last.txt": bytes("z"),
      "a/first.txt": bytes("a"),
      "types/note.md": bytes("---\ntypeId: note\nfields: {}\n---")
    });

    const { ignored } = readZipSnapshotFromBytes(zipBytes);

    expect(ignored).toEqual(["a/first.txt", "z/last.txt"]);
  });
});
