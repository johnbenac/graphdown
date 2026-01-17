import { describe, expect, it } from "vitest";
import { zipSync } from "fflate";
import { readZipSnapshotFromBytes } from "../readZipSnapshotFromBytes";

const enc = new TextEncoder();
const bytes = (text: string) => enc.encode(text);

describe("readZipSnapshotFromBytes fail-fast", () => {
  it("throws when a declared plugin bundle file is missing", () => {
    const manifestText = [
      "---",
      "pluginId: demo",
      "gdApiVersion: 1",
      "entry: entry.js",
      "---",
      "Demo plugin"
    ].join("\n");
    const zipBytes = zipSync({
      "plugins/demo/plugin.md": bytes(manifestText),
      "types/note.md": bytes("---\ntypeId: note\nfields: {}\n---")
    });

    expect(() => readZipSnapshotFromBytes(zipBytes)).toThrow(/Missing plugin bundle files/);
  });

  it("throws when a plugin manifest cannot be parsed", () => {
    const badManifestText = "---\npluginId: demo\ngdApiVersion: 1\nentry: entry.js";
    const zipBytes = zipSync({
      "plugins/demo/plugin.md": bytes(badManifestText)
    });

    expect(() => readZipSnapshotFromBytes(zipBytes)).toThrow(/Plugin manifest parse error/);
  });

  it("throws on path normalization collisions", () => {
    const zipBytes = zipSync({
      "a/b.txt": bytes("one"),
      "a\\b.txt": bytes("two")
    });

    expect(() => readZipSnapshotFromBytes(zipBytes)).toThrow(/collision/);
  });

  it("returns ignored entries sorted lexicographically", () => {
    const zipBytes = zipSync({
      "types/note.md": bytes("---\ntypeId: note\nfields: {}\n---"),
      "z.txt": bytes("z"),
      "a.txt": bytes("a")
    });

    const { ignored } = readZipSnapshotFromBytes(zipBytes);

    expect(ignored).toEqual(["a.txt", "z.txt"]);
  });
});
