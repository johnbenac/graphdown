import { describe, expect, it } from "vitest";

import { readRef, readRefs, writeRef, writeRefs } from "./wikiLinks";

describe("wikiLinks helpers", () => {
  it("REL-005: writeRef writes wiki-links", () => {
    expect(writeRef("record:1")).toBe("[[record:1]]");
    expect(writeRef("")).toBeUndefined();
  });

  it("REL-005: writeRefs writes wiki-link arrays", () => {
    expect(writeRefs(["record:1", "record:2"])).toEqual(["[[record:1]]", "[[record:2]]"]);
    expect(writeRefs([])).toBeUndefined();
  });

  it("REL-007: readRef/readRefs return cleaned ids from legacy shapes", () => {
    expect(readRef({ ref: "[[record:1]]" })).toBe("record:1");
    expect(readRefs({ refs: ["[[record:1]]", "record:2"] })).toEqual(["record:1", "record:2"]);
  });
});
