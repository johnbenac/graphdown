import { describe, expect, it } from "vitest";

import { buildRecordLinkGraphFromSnapshot, validateDatasetSnapshot } from "@graphdown/dataset";
import { snapshotFromTextFiles } from "../../harness";

describe("integration: dataset record link graph", () => {
  it("indexes outgoing/incoming links from record body + fields, and ignores plugin bundle files", () => {
    const snapshot = snapshotFromTextFiles([
      [
        "types/note.md",
        ["---", "typeId: note", "fields: {}", "---", "# Note Type", ""].join("\n")
      ],

      // Record one:
      // - links to note:two from BOTH body and fields (dedupe expected)
      // - links to note:three from nested field string
      // - links to note:missing (missing records are allowed; graph should still index it)
      // - includes a split token that MUST NOT synthesize into a link
      [
        "records/note/one.md",
        [
          "---",
          "typeId: note",
          "recordId: one",
          "fields:",
          '  title: "One"',
          '  ref: "See [[note:two]]"',
          "  nested:",
          '    deep: "Also links to [[note:three]]"',
          "  split:",
          '    - "[[note:four"',
          '    - "]]"',
          "---",
          "",
          "Body links to [[ note:two ]] and [[note:missing]].",
          "Also includes a block ref that must NOT be treated as a record link:",
          "[[bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku]].",
          ""
        ].join("\n")
      ],

      // Record two links back to note:one (and includes an alias token which must be ignored)
      [
        "records/note/two.md",
        [
          "---",
          "typeId: note",
          "recordId: two",
          "fields:",
          '  title: "Two"',
          "---",
          "",
          "Backlink to [[note:one]] and an alias token [[note:one|alias]] (alias ignored).",
          ""
        ].join("\n")
      ],

      // Record three exists only to be a valid link target
      [
        "records/note/three.md",
        [
          "---",
          "typeId: note",
          "recordId: three",
          "fields: {}",
          "---",
          "",
          "No links here.",
          ""
        ].join("\n")
      ],

      ["blocks/sha2-256/e3/bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku", ""],

      // Plugin manifest declares a bundle file "recordlike.md" that LOOKS like a record and contains links.
      // That file MUST be ignored by graphdown record discovery (plugin bundles are excluded),
      // so it MUST NOT create nodes/edges in the Record Link Graph.
      [
        "plugins/demo/manifest.md",
        [
          "---",
          "pluginId: demo",
          "gdApiVersion: 1",
          "entry: entry.js",
          "files:",
          "  - entry.js",
          "  - recordlike.md",
          "---",
          "",
          "Plugin manifest for record-link-graph integration test.",
          ""
        ].join("\n")
      ],
      ["plugins/demo/entry.js", "export function activate() { return {}; }\n"],
      [
        "plugins/demo/recordlike.md",
        [
          "---",
          "typeId: note",
          "recordId: bundle",
          "fields:",
          '  title: "Bundle"',
          "---",
          "",
          "This file is a plugin bundle. If it were parsed as a record, it would link to [[note:one]].",
          "It MUST NOT affect the Record Link Graph.",
          ""
        ].join("\n")
      ]
    ]);

    // Keep this integration test honest: the dataset snapshot must be valid.
    const validation = validateDatasetSnapshot(snapshot);
    expect(validation.ok).toBe(true);

    const graphResult = buildRecordLinkGraphFromSnapshot(snapshot);
    expect(graphResult.ok).toBe(true);
    if (!graphResult.ok) return;

    const graph = graphResult.graph;

    // Sanity: nodes exist for real records/types
    expect(graph.getType("note")).not.toBeNull();
    expect(graph.getRecord("note:one")).not.toBeNull();
    expect(graph.getRecord("note:two")).not.toBeNull();
    expect(graph.getRecord("note:three")).not.toBeNull();

    // Critical: plugin bundle "recordlike.md" must NOT become a record node
    expect(graph.getRecord("note:bundle")).toBeNull();

    // Outgoing edges are deduped + sorted.
    // Expected:
    // - note:two (from body + fields, deduped)
    // - note:three (from nested field string)
    // - note:missing (missing record allowed; still indexed)
    // Not expected:
    // - note:four (split across strings; must NOT synthesize)
    expect(graph.getOutgoingRecordLinks("note:one")).toEqual(["note:missing", "note:three", "note:two"]);
    expect(graph.getOutgoingRecordLinks("note:two")).toEqual(["note:one"]);
    expect(graph.getOutgoingRecordLinks("note:three")).toEqual([]);

    // Incoming edges are sorted.
    // If plugin bundle was incorrectly parsed, note:one would also have incoming from note:bundle.
    expect(graph.getIncomingRecordLinks("note:one")).toEqual(["note:two"]);
    expect(graph.getIncomingRecordLinks("note:two")).toEqual(["note:one"]);
    expect(graph.getIncomingRecordLinks("note:three")).toEqual(["note:one"]);

    // Missing records can still have incoming edges recorded (useful for “broken link” UX).
    expect(graph.getIncomingRecordLinks("note:missing")).toEqual(["note:one"]);
  });
});
