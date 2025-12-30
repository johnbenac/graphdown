import { describe, expect, it } from "vitest";
import { parseMarkdownRecord } from "../../../../src/core/graph";
import { serializeMarkdownRecord } from "../../../../src/core/markdownRecord";

describe("serializeMarkdownRecord", () => {
  it("round-trips markdown records with updated fields and body", () => {
    const initialYaml = {
      id: "record:1",
      datasetId: "dataset:demo",
      typeId: "note",
      createdAt: "2024-01-01",
      updatedAt: "2024-01-02",
      fields: {
        title: "Hello",
        count: 2
      }
    };
    const markdown = serializeMarkdownRecord({ yaml: initialYaml, body: "Initial body" });
    const parsed = parseMarkdownRecord(markdown, "records/note/record-1.md");
    if (!parsed.ok) {
      throw new Error(parsed.error.message);
    }
    expect(parsed.yaml.fields).toMatchObject({ title: "Hello", count: 2 });
    expect(parsed.body).toBe("Initial body\n");

    const updatedYaml = {
      ...parsed.yaml,
      fields: {
        ...parsed.yaml.fields,
        status: "done"
      }
    };
    const updatedMarkdown = serializeMarkdownRecord({ yaml: updatedYaml, body: "Updated body" });
    const reParsed = parseMarkdownRecord(updatedMarkdown, "records/note/record-1.md");
    if (!reParsed.ok) {
      throw new Error(reParsed.error.message);
    }
    expect(reParsed.yaml.fields).toMatchObject({ title: "Hello", count: 2, status: "done" });
    expect(reParsed.body).toBe("Updated body\n");
  });
});
