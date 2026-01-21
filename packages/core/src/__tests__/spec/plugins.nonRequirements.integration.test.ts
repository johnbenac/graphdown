import assert from "node:assert/strict";
import { describe, expect, it } from "vitest";

import {
  blockPathForCid,
  buildRecordLinkGraphFromSnapshot,
  canonicalizeDatasetSnapshot,
  cidFromRawBytes,
  computeGdHashV1,
  validateDatasetSnapshot
} from "../../index";
import type { DatasetSnapshot } from "../../index";

const encoder = new TextEncoder();

function mdWithFrontMatter(yamlLines: string[], bodyLines: string[] = []): Uint8Array {
  return encoder.encode(["---", ...yamlLines, "---", ...bodyLines, ""].join("\n"));
}

function digestSnapshot(snapshot: DatasetSnapshot): string {
  const result = computeGdHashV1(snapshot, "snapshot");
  if (!result.ok) {
    assert.fail(JSON.stringify(result.errors));
  }
  return result.cid;
}

describe("plugin non-requirements (core must ignore plugin-defined semantics)", () => {
  it("NR-PLUG-LINK-001: no relationship or CID extraction from plugin manifest bodies or bundle contents", () => {
    // A CID-shaped token that should FAIL DASL CIDv1 decoding:
    // "b" + 58 base32 chars => matches CID lexical shape but is not a valid CID.
    const invalidCidToken = `b${"a".repeat(58)}`;

    // A valid block that is referenced ONLY in plugin text (never from records or manifest.blocks[]).
    const orphanBlockBytes = encoder.encode("orphan-block-bytes");
    const orphanCid = cidFromRawBytes(orphanBlockBytes);
    const orphanPath = blockPathForCid(orphanCid);

    const typeBytes = mdWithFrontMatter(["typeId: note", "fields: {}"]);
    const recordBytes = mdWithFrontMatter(
      ["typeId: note", "recordId: a", "fields: {}"],
      ["Hello from record note:a (no links, no CIDs)."]
    );

    const manifestBytes = mdWithFrontMatter(
      [
        "pluginId: demo",
        "gdApiVersion: 1",
        "entry: entry.js",
        "files:",
        "  - entry.js",
        "  - ui.md",
        "  - recordlike.md"
      ],
      [
        // These MUST be ignored for relationship/CID extraction:
        "This body tries to smuggle semantics into core.",
        "Record ref that must NOT become a relationship edge: [[note:target]]",
        `Valid CID-shaped token that must NOT become a block ref: [[${orphanCid}]]`,
        `Invalid CID-shaped token that must NOT cause E_CID_INVALID: [[${invalidCidToken}]]`
      ]
    );

    // Plugin bundle markdown that looks like a record (front matter present); it must still be ignored.
    const recordLikePluginMdBytes = mdWithFrontMatter(
      ["typeId: note", "recordId: bundle", "fields: {}"],
      [
        "This plugin bundle file contains record-looking front matter.",
        "Links/CIDs here MUST NOT be scanned by core:",
        "Smuggled record link: [[note:target]]",
        `Smuggled CID: [[${orphanCid}]]`,
        `Smuggled invalid CID: [[${invalidCidToken}]]`
      ]
    );

    const entryBytes = encoder.encode(
      [
        "// Bundle file contents MUST NOT be scanned for refs.",
        "// [[note:target]]",
        `// [[${orphanCid}]]`,
        `// [[${invalidCidToken}]]`,
        ""
      ].join("\n")
    );

    const uiBytes = encoder.encode(
      [
        "UI bundle content MUST NOT be scanned either.",
        "Mentions: [[note:target]]",
        `Mentions CID: [[${orphanCid}]]`,
        `Mentions invalid CID: [[${invalidCidToken}]]`,
        ""
      ].join("\n")
    );

    const snapshot: DatasetSnapshot = {
      files: new Map<string, Uint8Array>([
        ["types/note.md", typeBytes],
        ["somewhere/record-a.md", recordBytes],
        ["plugins/demo/manifest.md", manifestBytes],
        ["plugins/demo/entry.js", entryBytes],
        ["plugins/demo/ui.md", uiBytes],
        ["plugins/demo/recordlike.md", recordLikePluginMdBytes],

        // Present but garbage (should remain valid; should be excluded from canonical export).
        [orphanPath, orphanBlockBytes]
      ])
    };

    // If core incorrectly scans plugin bodies/bundles for CID refs, this would fail with E_CID_INVALID
    // or block-reference errors. It MUST pass.
    const validation = validateDatasetSnapshot(snapshot);
    expect(validation.ok).toBe(true);

    // If core incorrectly scans plugin bodies/bundles for record links, the record-link graph would
    // show incoming edges for note:target. It MUST NOT.
    const graphResult = buildRecordLinkGraphFromSnapshot(snapshot);
    expect(graphResult.ok).toBe(true);
    if (!graphResult.ok) return;

    expect(graphResult.graph.getIncomingRecordLinks("note:target")).toEqual([]);
    expect(graphResult.graph.getOutgoingRecordLinks("note:a")).toEqual([]);
    expect(graphResult.graph.getOutgoingRecordLinks("note:bundle")).toEqual([]);

    // If core incorrectly scans plugin bodies/bundles for CID refs during GC/export reachability,
    // it would include orphanPath in canonical output. It MUST NOT.
    const canonical = canonicalizeDatasetSnapshot(snapshot);
    expect(canonical.files.has(orphanPath)).toBe(false);
  });

  it("NR-PLUG-VAL-001: plugin bundle content is not executed or interpreted as additional validity rules", () => {
    // This record intentionally violates a hypothetical plugin rule; core must not care.
    const typeBytes = mdWithFrontMatter(["typeId: note", "fields: {}"]);
    const recordBytes = mdWithFrontMatter(
      ["typeId: note", "recordId: a", "fields: {}"],
      ["This is valid per core. A plugin might want to reject it; core MUST NOT execute that logic."]
    );

    const manifestBytes = mdWithFrontMatter(
      [
        "pluginId: demo",
        "gdApiVersion: 1",
        "entry: entry.js",
        "files:",
        "  - entry.js",
        "  - rules.json",
        "requires:",
        "  - gd.host.capability.that.does.not.exist",
        "config:",
        "  pluginDefinedRules:",
        "    requiredFields:",
        "      - title"
      ],
      ["Plugin declares rules/capabilities here; core must treat them as opaque (shape-checked only)."]
    );

    // If executed, this would throw. Core MUST NOT execute it during validation.
    const entryBytes = encoder.encode(
      [
        "throw new Error('If core executes plugin code during validation, this is a critical bug');",
        ""
      ].join("\n")
    );

    // A made-up plugin rules file; core MUST NOT interpret it.
    const rulesBytes = encoder.encode(JSON.stringify({ requiredFields: ["title"] }, null, 2) + "\n");

    const snapshot: DatasetSnapshot = {
      files: new Map<string, Uint8Array>([
        ["types/note.md", typeBytes],
        ["records/note-a.md", recordBytes],
        ["plugins/demo/manifest.md", manifestBytes],
        ["plugins/demo/entry.js", entryBytes],
        ["plugins/demo/rules.json", rulesBytes]
      ])
    };

    const result = validateDatasetSnapshot(snapshot);
    expect(result.ok).toBe(true);
  });

  it("NR-PLUG-EXP-001: plugins do not define canonical export (no extra includes, no layout overrides, no rewrites)", () => {
    const typeBytes = mdWithFrontMatter(["typeId: note", "fields: {}"]);
    const recordBytes = mdWithFrontMatter(
      ["typeId: note", "recordId: a", "fields: {}", "parent: null"],
      ["Record content MUST be preserved byte-for-byte by canonical export."]
    );

    const manifestBytes = mdWithFrontMatter(
      [
        "pluginId: demo",
        "gdApiVersion: 1",
        "entry: entry.js",
        "files:",
        "  - entry.js",
        "  - ui.md"
      ],
      [
        // This is a “directive” that MUST be ignored by export.
        "EXPORT DIRECTIVE (must be ignored): include plugins/demo/extra.txt"
      ]
    );

    const entryBytes = encoder.encode("console.log('plugin');\n");
    const uiBytes = encoder.encode("UI file\n");

    // Files present in the repo snapshot but NOT part of the canonical export set:
    const unlistedPluginDirFile = encoder.encode("i am not declared in files[]\n");
    const unrelatedRepoFile = encoder.encode("i am unrelated and must not be exported\n");

    const snapshot: DatasetSnapshot = {
      files: new Map<string, Uint8Array>([
        ["types/note.md", typeBytes],
        ["weird/path/to/record-a.md", recordBytes],

        ["plugins/demo/manifest.md", manifestBytes],
        ["plugins/demo/entry.js", entryBytes],
        ["plugins/demo/ui.md", uiBytes],

        // Not declared in manifest.files[] -> MUST NOT appear anywhere in canonical export.
        ["plugins/demo/extra.txt", unlistedPluginDirFile],

        // Not semantic -> MUST NOT appear in canonical export.
        ["docs/README.txt", unrelatedRepoFile]
      ])
    };

    const validation = validateDatasetSnapshot(snapshot);
    expect(validation.ok).toBe(true);

    const canonical = canonicalizeDatasetSnapshot(snapshot);

    // Core-defined export layout for types/records MUST hold, regardless of plugins.
    expect(canonical.files.get("types/note.md")).toEqual(typeBytes);
    expect(canonical.files.get("records/note.a/a.md")).toEqual(recordBytes);

    // Core-defined plugin export layout MUST hold.
    expect(canonical.files.get("plugins/demo/manifest.md")).toEqual(manifestBytes);
    expect(canonical.files.get("plugins/demo/entry.js")).toEqual(entryBytes);
    expect(canonical.files.get("plugins/demo/ui.md")).toEqual(uiBytes);

    // The plugin MUST NOT be able to “request” extra exported files.
    expect(canonical.files.has("plugins/demo/extra.txt")).toBe(false);
    expect(canonical.files.has("plugins/demo/extra.txt")).toBe(false);
    expect(canonical.files.has("docs/README.txt")).toBe(false);
  });

  it("NR-PLUG-HASH-001: plugins do not define hashing semantics (gdhash-v1 inputs are fixed by core)", () => {
    const typeBytes = mdWithFrontMatter(["typeId: note", "fields: {}"]);
    const recordBytes = mdWithFrontMatter(
      ["typeId: note", "recordId: a", "fields: {}"],
      ["Record body\n"]
    );

    const manifestBytes = mdWithFrontMatter(
      [
        "pluginId: demo",
        "gdApiVersion: 1",
        "entry: entry.js",
        "files:",
        "  - entry.js"
      ],
      [
        // Even if the plugin “mentions” extra files, hash inputs MUST NOT change.
        "HASH DIRECTIVE (must be ignored): include assets/extra.txt"
      ]
    );

    const entryBytes = encoder.encode("// plugin entry\n");

    const base: DatasetSnapshot = {
      files: new Map<string, Uint8Array>([
        ["types/note.md", typeBytes],
        ["records/note-a.md", recordBytes],
        ["plugins/demo/manifest.md", manifestBytes],
        ["plugins/demo/entry.js", entryBytes]
      ])
    };

    const digestBase = digestSnapshot(base);

    // Add a non-semantic file that a plugin might want to “pull into hashing”.
    // Core MUST ignore it for hashing, so the digest MUST remain unchanged.
    const withExtra: DatasetSnapshot = { files: new Map(base.files) };
    withExtra.files.set("assets/extra.txt", encoder.encode("do-not-hash-me\n"));

    const digestExtra = digestSnapshot(withExtra);

    expect(digestExtra).toBe(digestBase);
  });
});
