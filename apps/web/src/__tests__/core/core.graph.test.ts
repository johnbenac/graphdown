import assert from "node:assert/strict";
import { it } from "vitest";
import { buildGraphFromSnapshot } from "../../core/graph";

const encoder = new TextEncoder();

function snapshot(entries: Array<[string, string]>): { files: Map<string, Uint8Array> } {
  return { files: new Map(entries.map(([path, content]) => [path, encoder.encode(content)])) };
}

function typeFile(typeId: string) {
  return ["---", `typeId: ${typeId}`, "fields: {}", "---", ""].join("\n");
}

function recordFile(typeId: string, recordId: string, body = "", extraFields = "") {
  return ["---", `typeId: ${typeId}`, `recordId: ${recordId}`, "fields: {}", extraFields, "---", body].join("\n");
}

it("REL-002: extracts record links from bodies and fields", () => {
  const snap = snapshot([
    ["types/note.md", typeFile("note")],
    ["records/note.one/one.md", recordFile("note", "one", "See [[note:two]].")],
    [
      "records/note.two/two.md",
      ["---", "typeId: note", "recordId: two", "fields:", '  ref: "[[note:one]]"', "---", "Backlink"].join("\n")
    ]
  ]);

  const result = buildGraphFromSnapshot(snap);
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  const { graph } = result;
  assert.deepEqual(graph.getLinksFrom("note:one"), ["note:two"]);
  assert.deepEqual(graph.getLinksTo("note:one"), ["note:two"]);
});

it("REL-002: does not synthesize links across separate string values", () => {
  const snap = snapshot([
    ["types/note.md", typeFile("note")],
    [
      "records/note.one/one.md",
      ["---", "typeId: note", "recordId: one", "fields:", '  part1: "[[note:two"', '  part2: "]]"', "---", ""].join(
        "\n"
      )
    ],
    ["records/note.two/two.md", recordFile("note", "two")]
  ]);

  const result = buildGraphFromSnapshot(snap);
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  const { graph } = result;
  assert.deepEqual(graph.getLinksFrom("note:one"), []);
  assert.deepEqual(graph.getLinksTo("note:two"), []);
});

it("Graph exposes type and record lookup by identity", () => {
  const snap = snapshot([
    ["types/note.md", typeFile("note")],
    ["records/note.one/one.md", recordFile("note", "one")]
  ]);

  const result = buildGraphFromSnapshot(snap);
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  const { graph } = result;
  const type = graph.getType("note");
  assert.ok(type);
  const record = graph.getRecord("note:one");
  assert.ok(record);
  assert.equal(graph.getTypeForRecord("note:one")?.typeId, "note");
});

it("VAL-002: duplicate record identity fails graph build", () => {
  const content = recordFile("note", "one");
  const snap = snapshot([
    ["types/note.md", typeFile("note")],
    ["records/note.one/one.md", content],
    ["records/note.one/one-alt.md", content]
  ]);

  const result = buildGraphFromSnapshot(snap);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === "E_DUPLICATE_ID"));
});
