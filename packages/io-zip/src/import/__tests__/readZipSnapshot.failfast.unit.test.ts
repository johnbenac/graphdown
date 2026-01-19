import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";

import { isImportError } from "@graphdown/io";
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

    try {
      readZipSnapshotFromBytes(zipBytes);
      throw new Error("Expected missing bundle error.");
    } catch (err) {
      expect(isImportError(err)).toBe(true);
      if (isImportError(err)) {
        expect(err.info.source).toBe("zip");
        expect(err.info.code).toBe("missing_files");
        expect(err.info.missingPaths).toContain("plugins/demo/entry.js");
      }
    }
  });

  it("throws on zip path normalization collisions", () => {
    const zipBytes = zipSync({
      "a/b.txt": bytes("one"),
      "a\\b.txt": bytes("two")
    });

    let caught: unknown;
    try {
      readZipSnapshotFromBytes(zipBytes);
    } catch (err) {
      caught = err;
    }

    expect(isImportError(caught)).toBe(true);
    if (isImportError(caught)) {
      expect(caught.info.source).toBe("zip");
      expect(caught.info.code).toBe("invalid_input");
      expect(caught.info.message).toMatch(/collision/i);
    }
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
