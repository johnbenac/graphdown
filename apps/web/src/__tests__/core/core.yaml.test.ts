import assert from "node:assert/strict";
import { it } from "vitest";
import { parseYamlObject } from "../../core/yaml";

it("FR-MD-020: parses YAML objects", () => {
  assert.deepEqual(parseYamlObject("a: 1"), { a: 1 });
});

it("FR-MD-020: invalid YAML fails parsing", () => {
  assert.throws(() => parseYamlObject("a: [1, 2"), /./);
});

it("FR-MD-020: non-object YAML front matter is invalid", () => {
  assert.throws(
    () => parseYamlObject("- a\n- b"),
    /YAML front matter is not a valid object/
  );
  assert.throws(
    () => parseYamlObject("hello"),
    /YAML front matter is not a valid object/
  );
  assert.throws(
    () => parseYamlObject(""),
    /YAML front matter is not a valid object/
  );
});
