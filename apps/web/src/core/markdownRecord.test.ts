import { describe, expect, it } from "vitest";
import { parseMarkdownRecord } from "../../../../src/core/graph";
import { serializeMarkdownRecord } from "../../../../src/core/markdownRecord";

describe("serializeMarkdownRecord", () => {
  it("round-trips YAML and body content", () => {
    const initialYaml = {
      id: "record:1",
      datasetId: "dataset:demo",
      typeId: "note",
      createdAt: "2024-01-01",
      updatedAt: "2024-01-02",
      fields: {
        title: "Initial",
        assignee: { ref: "record:person-1" }
      }
    };

    const initialText = serializeMarkdownRecord({ yaml: initialYaml, body: "Hello body" });
    const parsed = parseMarkdownRecord(initialText, "records/note/record-1.md");
    if (!parsed.ok) {
      throw new Error(parsed.error.message);
    }

    const updatedYaml = {
      ...parsed.yaml,
      updatedAt: "2024-02-01",
      fields: {
        ...(parsed.yaml.fields as Record<string, unknown>),
        title: "Updated"
      }
    };

    const updatedText = serializeMarkdownRecord({ yaml: updatedYaml, body: "Updated body" });
    const reparsed = parseMarkdownRecord(updatedText, "records/note/record-1.md");
    expect(reparsed.ok).toBe(true);
    if (reparsed.ok) {
      expect(reparsed.yaml.fields).toMatchObject({ title: "Updated" });
      expect(reparsed.body.trim()).toBe("Updated body");
    }
  });
});
