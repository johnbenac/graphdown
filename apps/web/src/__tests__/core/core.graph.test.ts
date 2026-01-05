import { describe, expect, it } from "vitest";
import { buildGraphFromSnapshot } from "../../core/graph";

const encoder = new TextEncoder();

function snapshot(entries: Array<[string, string]>) {
  return { files: new Map(entries.map(([path, content]) => [path, encoder.encode(content)])) };
}

function typeFile(typeId: string) {
  return ["---", `typeId: ${typeId}`, "fields: {}", "---", ""].join("\n");
}

function recordFile(typeId: string, recordId: string, body = "", extraFields = "") {
  return ["---", `typeId: ${typeId}`, `recordId: ${recordId}`, "fields: {}", extraFields, "---", body].join("\n");
}

describe("graph", () => {
  it("REL-002: extracts record links from bodies and fields", () => {
    const snap = snapshot([
      ["types/note.md", typeFile("note")],
      ["records/note-1.md", recordFile("note", "one", "See [[note:two]].")],
      [
        "records/note-2.md",
        ["---", "typeId: note", "recordId: two", "fields:", '  ref: "[[note:one]]"', "---", "Backlink"].join("\n")
      ]
    ]);

    const result = buildGraphFromSnapshot(snap);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const { graph } = result;
    expect(graph.getLinksFrom("note:one")).toEqual(["note:two"]);
    expect(graph.getLinksTo("note:one")).toEqual(["note:two"]);
  });

  it("REL-002: does not synthesize links across separate string values", () => {
    const snap = snapshot([
      ["types/note.md", typeFile("note")],
      [
        "records/note-1.md",
        ["---", "typeId: note", "recordId: one", "fields:", '  part1: "[[note:two"', '  part2: "]]"', "---", ""].join(
          "\n"
        )
      ],
      ["records/note-2.md", recordFile("note", "two")]
    ]);

    const result = buildGraphFromSnapshot(snap);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const { graph } = result;
    expect(graph.getLinksFrom("note:one")).toEqual([]);
    expect(graph.getLinksTo("note:two")).toEqual([]);
  });

  it("Graph exposes type and record lookup by identity", () => {
    const snap = snapshot([
      ["t.md", typeFile("note")],
      ["r.md", recordFile("note", "one")]
    ]);

    const result = buildGraphFromSnapshot(snap);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const { graph } = result;
    const type = graph.getType("note");
    expect(type).not.toBeNull();
    const record = graph.getRecord("note:one");
    expect(record).not.toBeNull();
    expect(graph.getTypeForRecord("note:one")?.typeId).toBe("note");
  });

  it("VAL-002: duplicate record identity fails graph build", () => {
    const content = recordFile("note", "one");
    const snap = snapshot([
      ["t.md", typeFile("note")],
      ["r1.md", content],
      ["r2.md", content]
    ]);

    const result = buildGraphFromSnapshot(snap);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.errors.some((error) => error.code === "E_DUPLICATE_ID")).toBe(true);
  });
});
