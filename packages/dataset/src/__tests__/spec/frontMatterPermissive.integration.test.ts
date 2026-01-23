import assert from "node:assert/strict";
import { describe, expect, it } from "vitest";

import {
  computeGdHashV1,
  discoverGraphMDObjects,
  validateDatasetSnapshot
} from "../../index.js";
import type { DatasetSnapshot } from "../../index.js";

const encoder = new TextEncoder();

function snapshot(entries: Array<[string, string]>): DatasetSnapshot {
  return { files: new Map(entries.map(([path, content]) => [path, encoder.encode(content)])) };
}

function digestSnapshot(snapshot: DatasetSnapshot): string {
  const result = computeGdHashV1(snapshot, "snapshot");
  if (!result.ok) {
    assert.fail(JSON.stringify(result.errors));
  }
  return result.cid;
}

describe("front matter permissiveness", () => {
  it("LAYOUT-003: invalid YAML front matter is ignored for discovery and validation", () => {
    const snap = snapshot([["docs/bad-frontmatter.md", "---\nnot: [valid, yaml\n# missing bracket"]]);
    const validation = validateDatasetSnapshot(snap);
    expect(validation.ok).toBe(true);

    const discovery = discoverGraphMDObjects(snap);
    expect(discovery.errors).toEqual([]);
    expect(discovery.typeObjects).toEqual([]);
    expect(discovery.recordObjects).toEqual([]);
    expect(discovery.ignored).toContain("docs/bad-frontmatter.md");
  });

  it("LAYOUT-003: valid YAML without reserved keys is ignored for hashing", () => {
    const base = snapshot([["types/note.md", ["---", "typeId: note", "fields: {}", "---", ""].join("\n")]]);
    const withNotes = snapshot([
      ["types/note.md", ["---", "typeId: note", "fields: {}", "---", ""].join("\n")],
      [
        "notes/obsidian.md",
        ["---", "tags: [camping, meeting]", "aliases: [\"Pack meeting notes\"]", "---", "# notes"].join("\n")
      ]
    ]);

    expect(digestSnapshot(withNotes)).toBe(digestSnapshot(base));
  });

  it("LAYOUT-003: malformed YAML front matter is ignored for hashing", () => {
    const base = snapshot([["types/note.md", ["---", "typeId: note", "fields: {}", "---", ""].join("\n")]]);
    const withBadDoc = snapshot([
      ["types/note.md", ["---", "typeId: note", "fields: {}", "---", ""].join("\n")],
      ["docs/bad-frontmatter.md", "---\nnot: [valid, yaml\n# missing bracket"]
    ]);

    expect(digestSnapshot(withBadDoc)).toBe(digestSnapshot(base));
  });
});
