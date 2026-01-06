import { describe, expect, it } from "vitest";
import { computeIgnoredPaths } from "./computeIgnoredPaths";

describe("computeIgnoredPaths", () => {
  it("returns sorted, unique paths that are present in source but not included", () => {
    const source = ["b/file.txt", "a/file.txt", "b/file.txt", "c/file.txt"];
    const included = ["b/file.txt", "not-in-source.md"];

    const ignored = computeIgnoredPaths(source, included);

    expect(ignored).toEqual(["a/file.txt", "c/file.txt"]);
    expect(new Set(ignored).size).toBe(ignored.length);
    expect(ignored).toEqual([...ignored].sort((a, b) => a.localeCompare(b)));
  });
});
