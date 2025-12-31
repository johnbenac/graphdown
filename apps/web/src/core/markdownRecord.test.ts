import { describe, expect, it } from "vitest";
import { parseMarkdownRecord } from "../../../../src/core/graph";
import { serializeMarkdownRecord } from "../../../../src/core/markdownRecord";

describe("serializeMarkdownRecord", () => {
  it("FR-MD-022: serializer preserves raw Markdown body and updated YAML", () => {
    const input = [
      "---",
      "id: record:1",
      "datasetId: dataset:demo",
      "typeId: note",
      "createdAt: 2024-01-01",
      "updatedAt: 2024-01-02",
      "fields:",
      "  title: Draft",
      "---",
      "Initial body."
    ].join("\n");

    const parsed = parseMarkdownRecord(input, "records/note/record-1.md");
    if (!parsed.ok) {
      throw new Error(parsed.error.message);
    }

    const nextYaml: Record<string, unknown> = {
      ...parsed.yaml,
      updatedAt: "2024-01-03",
      fields: {
        ...(parsed.yaml.fields as Record<string, unknown>),
        status: "done"
      }
    };

    const output = serializeMarkdownRecord({ yaml: nextYaml, body: "Updated body." });
    const reparsed = parseMarkdownRecord(output, "records/note/record-1.md");
    expect(reparsed.ok).toBe(true);
    if (!reparsed.ok) {
      return;
    }

    expect(reparsed.body.trimEnd()).toBe("Updated body.");
    expect(reparsed.yaml.updatedAt).toBe("2024-01-03");
    expect((reparsed.yaml.fields as Record<string, unknown>).status).toBe("done");
  });
});
