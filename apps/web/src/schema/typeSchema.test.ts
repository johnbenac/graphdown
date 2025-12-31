import { describe, expect, it } from "vitest";

import { parseTypeSchema } from "./typeSchema";

describe("parseTypeSchema", () => {
  it("TYPE-004: missing fieldDefs yields an empty schema", () => {
    const result = parseTypeSchema({ recordTypeId: "note" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.schema.fields).toEqual([]);
    }
  });

  it("TYPE-004: null fieldDefs yields an empty schema", () => {
    const result = parseTypeSchema({ recordTypeId: "note", fieldDefs: null });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.schema.fields).toEqual([]);
    }
  });

  it("TYPE-004: fieldDefs map is accepted", () => {
    const result = parseTypeSchema({
      recordTypeId: "note",
      fieldDefs: {
        title: { kind: "string", required: true }
      }
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.schema.fields).toEqual([
        expect.objectContaining({ name: "title", kind: "string", required: true })
      ]);
    }
  });

  it("TYPE-004: fieldDefs array is rejected", () => {
    const result = parseTypeSchema({
      recordTypeId: "note",
      fieldDefs: [{ name: "title", kind: "string" }]
    });
    expect(result.ok).toBe(false);
  });
});
