import { describe, expect, it } from "vitest";
import { extractFrontMatter } from "../../core/frontMatter";

describe("frontMatter", () => {
  it("FR-MD-020: extracts yaml and body for valid front matter", () => {
    const content = ["---", "id: dataset:demo", "---", "Body text"].join("\n");
    const result = extractFrontMatter(content);

    expect(result.yaml.trim()).toBe("id: dataset:demo");
    expect(result.body).toBe("Body text");
  });

  it("FR-MD-020: missing YAML front matter fails parsing", () => {
    expect(() => extractFrontMatter("no front matter here")).toThrow(
      /Missing YAML front matter delimiter at top of file/
    );
  });
});
