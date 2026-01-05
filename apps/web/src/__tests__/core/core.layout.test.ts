import { describe, expect, it } from "vitest";
import { buildGraphFromSnapshot } from "../../core/graph";
import { validateDatasetSnapshot } from "../../core/validateDatasetSnapshot";

const encoder = new TextEncoder();

function snapshot(entries: Array<[string, string]>) {
  return { files: new Map(entries.map(([path, content]) => [path, encoder.encode(content)])) };
}

describe("layout", () => {
  it("LAYOUT-002: only first front matter block defines a record object", () => {
    const recordContent = [
      "---",
      "typeId: note",
      "recordId: one",
      "fields: {}",
      "---",
      "Body with a second YAML-looking block that must be treated as markdown only.",
      "---",
      "typeId: note",
      "recordId: two",
      "fields: {}",
      "---",
      "Trailing text."
    ].join("\n");

    const snap = snapshot([
      ["types/note.md", ["---", "typeId: note", "fields: {}", "---", ""].join("\n")],
      ["records/multi.md", recordContent]
    ]);

    const validation = validateDatasetSnapshot(snap);
    expect(validation.ok).toBe(true);

    const graphResult = buildGraphFromSnapshot(snap);
    expect(graphResult.ok).toBe(true);
    if (!graphResult.ok) {
      return;
    }

    const { graph } = graphResult;
    expect(graph.getRecord("note:one")).not.toBeNull();
    expect(graph.getRecord("note:two")).toBeNull();
    expect(graph.getLinksFrom("note:one")).toEqual([]);
  });
});
