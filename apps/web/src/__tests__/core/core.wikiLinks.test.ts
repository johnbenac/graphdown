import { describe, expect, it } from "vitest";
import { extractBlobRefs, extractRecordRefs } from "../../core/wikiLinks";

describe("wiki links", () => {
  it("REL-003: extracts record references from wiki-link tokens", () => {
    expect(extractRecordRefs("see [[note:one]] and [[note:two]]")).toEqual(["note:one", "note:two"]);
  });

  it("REL-003: ignores malformed record tokens and aliases", () => {
    expect(extractRecordRefs("[[ note:one ]] [[note:bad:extra]] [[note|alias]] [[note-1]]")).toEqual([
      "note:one"
    ]);
  });

  it("BLOB-REF-001: extracts blob references", () => {
    expect(extractBlobRefs(`see [[gdblob:sha256-${"a".repeat(64)}]]`)).toEqual(["a".repeat(64)]);
  });

  it("BLOB-REF-002: ignores malformed blob references", () => {
    const malformed = [
      "[[gdblob:sha256-]]",
      `[[gdblob:sha256-${"A".repeat(64)}]]`,
      `[[gdblob:sha256-${"a".repeat(63)}]]`,
      "[[note:one]]"
    ].join(" ");
    expect(extractBlobRefs(malformed)).toEqual([]);
  });

  it("REL-001: blob references are not treated as record relationships", () => {
    expect(extractRecordRefs(`see [[gdblob:sha256-${"a".repeat(64)}]]`)).toEqual([]);
  });

  it("BLOB-002: blob ids must be 64 lowercase hex characters", () => {
    const invalid = `[[gdblob:sha256-${"A".repeat(64)}]] [[gdblob:sha256-${"a".repeat(63)}]]`;
    expect(extractBlobRefs(invalid)).toEqual([]);
  });
});
