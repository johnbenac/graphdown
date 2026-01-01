import { describe, expect, it } from "vitest";

import { parseTypeSchema, readRef, readRefs, writeRef, writeRefs } from "./typeSchema";

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

describe("ref helpers", () => {
  it("REL-005/REL-007: writeRef writes wiki-links", () => {
    expect(writeRef("record:1")).toBe("[[record:1]]");
    expect(writeRef("")).toBeUndefined();
  });

  it("REL-005/REL-007: writeRefs writes wiki-link arrays", () => {
    expect(writeRefs(["record:1", "record:2"])).toEqual(["[[record:1]]", "[[record:2]]"]);
    expect(writeRefs([])).toBeUndefined();
  });

  it("REL-007: readRef/readRefs return cleaned ids from legacy shapes", () => {
    expect(readRef({ ref: "[[record:1]]" })).toBe("record:1");
    expect(readRefs({ refs: ["[[record:1]]", "record:2"] })).toEqual(["record:1", "record:2"]);
  });
});
