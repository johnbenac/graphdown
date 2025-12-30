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

  it("errors when fieldDefs is a non-array, non-null value", () => {
    const result = parseTypeSchema({ recordTypeId: "note", fieldDefs: {} });
    expect(result.ok).toBe(false);
  });
});
