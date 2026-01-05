import { describe, expect, it } from "vitest";
import { parseYamlObject } from "../../core/yaml";

describe("yaml", () => {
  it("FR-MD-020: parses YAML objects", () => {
    expect(parseYamlObject("a: 1")).toEqual({ a: 1 });
  });

  it("FR-MD-020: invalid YAML fails parsing", () => {
    expect(() => parseYamlObject("a: [1, 2")).toThrow(/./);
  });

  it("FR-MD-020: non-object YAML front matter is invalid", () => {
    expect(() => parseYamlObject("- a\n- b")).toThrow(/YAML front matter is not a valid object/);
    expect(() => parseYamlObject("hello")).toThrow(/YAML front matter is not a valid object/);
    expect(() => parseYamlObject("")).toThrow(/YAML front matter is not a valid object/);
  });
});
