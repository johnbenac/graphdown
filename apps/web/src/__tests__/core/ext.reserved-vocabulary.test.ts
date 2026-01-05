import { describe, expect, it } from "vitest";
import { validateDatasetSnapshot } from "../../core/validateDatasetSnapshot";

const encoder = new TextEncoder();

function snapshot(entries: Array<[string, string]>) {
  return { files: new Map(entries.map(([path, content]) => [path, encoder.encode(content)])) };
}

describe("reserved vocabulary", () => {
  it("EXT-001: extra top-level keys are forbidden", () => {
    const typeEntry: [string, string] = [
      "types/widget.md",
      ["---", "typeId: widget", "fields: {}", "notes: custom type metadata", "---", "Widget type"].join("\n")
    ];

    const recordEntry: [string, string] = [
      "records/widget-1.md",
      ["---", "typeId: widget", "recordId: one", "fields: {}", "source: importer", "---", "Widget record"].join("\n")
    ];

    const result = validateDatasetSnapshot(snapshot([typeEntry, recordEntry]));

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.errors.some((error) => error.code === "E_FORBIDDEN_TOP_LEVEL_KEY")).toBe(true);
  });

  it("EXT-002: accepts arbitrary shapes within fields", () => {
    const typeEntry: [string, string] = [
      "types/gizmo.md",
      ["---", "typeId: gizmo", "fields: {}", "---", "Gizmo type"].join("\n")
    ];

    const recordEntry: [string, string] = [
      "records/gizmo/gizmo-1.md",
      [
        "---",
        "typeId: gizmo",
        "recordId: one",
        "fields:",
        "  name: Gizmo One",
        "  count: 3",
        "  active: true",
        "  nothing: null",
        "  tags:",
        "    - alpha",
        "    - 2",
        "    - { nested: yes }",
        "  metadata:",
        "    owner: qa",
        "    notes:",
        "      - { label: first, score: 10 }",
        "      - { label: second, score: 20 }",
        "---",
        "Gizmo record"
      ].join("\n")
    ];

    const result = validateDatasetSnapshot(snapshot([typeEntry, recordEntry]));

    expect(result.ok).toBe(true);
  });
});
