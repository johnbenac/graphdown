import { describe, expect, it } from "vitest";
import { buildGraphFromSnapshot } from "../../core/graph";
import type { DatasetSnapshot } from "../../core/snapshotTypes";

const encoder = new TextEncoder();

function snapshotFromEntries(entries: Array<[string, string]>): DatasetSnapshot {
  return {
    files: new Map(entries.map(([path, content]) => [path, encoder.encode(content)]))
  };
}

function typeFile(typeId: string) {
  return ["---", `typeId: ${typeId}`, "fields: {}", "---", ""].join("\n");
}

function recordFile(typeId: string, recordId: string, body = "", extraFields = "") {
  return ["---", `typeId: ${typeId}`, `recordId: ${recordId}`, "fields: {}", extraFields, "---", body].join(
    "\n"
  );
}

describe("graph", () => {
  it("REL-002: extracts record links from bodies and fields", () => {
    const snapshot = snapshotFromEntries([
      ["types/note.md", typeFile("note")],
      ["records/note.one/one.md", recordFile("note", "one", "See [[note:two]].")],
      [
        "records/note.two/two.md",
        ["---", "typeId: note", "recordId: two", "fields:", '  ref: "[[note:one]]"', "---", "Backlink"].join(
          "\n"
        )
      ]
    ]);

    const result = buildGraphFromSnapshot(snapshot);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { graph } = result;
    expect(graph.getLinksFrom("note:one")).toEqual(["note:two"]);
    expect(graph.getLinksTo("note:one")).toEqual(["note:two"]);
  });

  it("REL-002: does not synthesize links across separate string values", () => {
    const snapshot = snapshotFromEntries([
      ["types/note.md", typeFile("note")],
      [
        "records/note.one/one.md",
        [
          "---",
          "typeId: note",
          "recordId: one",
          "fields:",
          '  part1: "[[note:two"',
          '  part2: "]]"',
          "---",
          ""
        ].join("\n")
      ],
      ["records/note.two/two.md", recordFile("note", "two")]
    ]);

    const result = buildGraphFromSnapshot(snapshot);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { graph } = result;
    expect(graph.getLinksFrom("note:one")).toEqual([]);
    expect(graph.getLinksTo("note:two")).toEqual([]);
  });

  it("Graph exposes type and record lookup by identity", () => {
    const snapshot = snapshotFromEntries([
      ["types/note.md", typeFile("note")],
      ["records/note.one/one.md", recordFile("note", "one")]
    ]);

    const result = buildGraphFromSnapshot(snapshot);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { graph } = result;
    expect(graph.getType("note")).toBeTruthy();
    expect(graph.getRecord("note:one")).toBeTruthy();
    expect(graph.getTypeForRecord("note:one")?.typeId).toBe("note");
  });

  it("VAL-002: duplicate record identity fails graph build", () => {
    const content = recordFile("note", "one");
    const snapshot = snapshotFromEntries([
      ["types/note.md", typeFile("note")],
      ["records/note.one/one.md", content],
      ["records/note.one/duplicate.md", content]
    ]);

    const result = buildGraphFromSnapshot(snapshot);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((error) => error.code === "E_DUPLICATE_ID")).toBe(true);
  });
});
