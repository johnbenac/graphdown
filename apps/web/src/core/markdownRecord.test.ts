import { describe, expect, it } from "vitest";
import { parseMarkdownRecord } from "../../../../src/core/graph";
import { serializeMarkdownRecord } from "../../../../src/core/markdownRecord";

describe("serializeMarkdownRecord", () => {
  it("round trips markdown records", () => {
    const source = [
      "---",
      "id: record:1",
      "datasetId: dataset:demo",
      "typeId: note",
      "createdAt: 2024-01-01",
      "updatedAt: 2024-01-02",
      "fields:",
      "  title: First",
      "  estimate: 3",
      "---",
      "Hello world"
    ].join("\n");

    const parsed = parseMarkdownRecord(source, "records/note/record-1.md");
    if (!parsed.ok) {
      throw new Error("Failed to parse markdown");
    }

    parsed.yaml.fields = {
      ...(parsed.yaml.fields as Record<string, unknown>),
      title: "Updated"
    };
    const serialized = serializeMarkdownRecord({ yaml: parsed.yaml, body: "Updated body" });
    const roundTrip = parseMarkdownRecord(serialized, "records/note/record-1.md");
    if (!roundTrip.ok) {
      throw new Error("Failed to parse serialized markdown");
    }

    expect(roundTrip.yaml.id).toBe("record:1");
    expect(roundTrip.yaml.fields).toMatchObject({ title: "Updated", estimate: 3 });
    expect(roundTrip.body).toBe("Updated body\n");
  });
});
