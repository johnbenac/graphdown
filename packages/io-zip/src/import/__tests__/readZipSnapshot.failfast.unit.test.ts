import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";

import { readZipSnapshotFromBytes } from "../readZipSnapshotFromBytes";

const bytes = (text: string) => new Uint8Array(strToU8(text));

describe("readZipSnapshotFromBytes fail-fast rules", () => {
  it("throws when a plugin manifest declares bundle files that are missing", () => {
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
      "plugins/demo/plugin.md": bytes(manifestText),
      "types/note.md": bytes("---\ntypeId: note\nfields: {}\n---\n")
    });

    expect(() => readZipSnapshotFromBytes(zipBytes)).toThrow(/Missing plugin bundle files/);
  });

  it("throws on zip path normalization collisions", () => {
    const zipBytes = zipSync({
      "a/b.txt": bytes("one"),
      "a\\b.txt": bytes("two")
    });

    expect(() => readZipSnapshotFromBytes(zipBytes)).toThrow(/collision/i);
  });

  it("returns ignored paths in deterministic order", () => {
    const zipBytes = zipSync({
      "types/note.md": bytes("---\ntypeId: note\nfields: {}\n---\n"),
      "docs/z.md": bytes("# z"),
      "docs/a.md": bytes("# a"),
      "assets/b.bin": new Uint8Array([0, 1, 2])
    });

    const { ignored } = readZipSnapshotFromBytes(zipBytes);
    expect(ignored).toEqual(["assets/b.bin", "docs/a.md", "docs/z.md"]);
  });
});
