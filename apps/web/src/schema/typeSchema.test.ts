import { describe, expect, it } from "vitest";

import { parseTypeSchema } from "./typeSchema";

describe("parseTypeSchema", () => {
  it("treats missing fieldDefs as empty schema", () => {
    const result = parseTypeSchema({ recordTypeId: "note" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.schema.fields).toEqual([]);
    }
  });

  it("treats null fieldDefs as empty schema", () => {
    const result = parseTypeSchema({ recordTypeId: "note", fieldDefs: null });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.schema.fields).toEqual([]);
    }
  });

  it("accepts map-shaped fieldDefs", () => {
    const result = parseTypeSchema({
      recordTypeId: "note",
      fieldDefs: { title: { kind: "string", required: true } }
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.schema.fields).toEqual([
        expect.objectContaining({ name: "title", kind: "string", required: true })
      ]);
    }
  });

  it("errors when fieldDefs is an array", () => {
    const result = parseTypeSchema({
      recordTypeId: "note",
      fieldDefs: [{ name: "title", kind: "string" }]
    });
    expect(result.ok).toBe(false);
  });
});
