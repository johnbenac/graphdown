import { describe, expect, it } from "vitest";

import { normalizeZipEntryPath } from "../zipPath";

describe("normalizeZipEntryPath", () => {
  it("normalizes backslashes and dot segments", () => {
    expect(normalizeZipEntryPath("root\\./a\\b")).toBe("root/a/b");
  });

  it("rejects traversal and empty segments", () => {
    expect(() => normalizeZipEntryPath("a/../b")).toThrow(/Invalid zip entry path/);
    expect(() => normalizeZipEntryPath("a//b")).toThrow(/Invalid zip entry path/);
  });

  it("rejects absolute paths", () => {
    expect(() => normalizeZipEntryPath("/abs/path")).toThrow(/Invalid zip entry path/);
  });

  it("accepts directory entries after validation", () => {
    expect(normalizeZipEntryPath("folder/")).toBe("folder");
  });
});
