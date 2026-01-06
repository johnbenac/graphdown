import { expect } from "vitest";

export function expectPartitionedImport(input: {
  sourcePaths: Iterable<string>;
  includedPaths: Iterable<string>;
  ignored: string[];
}) {
  const sourceSet = new Set(input.sourcePaths);
  const includedSet = new Set(input.includedPaths);
  const ignoredSet = new Set(input.ignored);

  expect(input.ignored).toEqual([...ignoredSet].sort((a, b) => a.localeCompare(b)));

  for (const path of input.ignored) {
    expect(includedSet.has(path)).toBe(false);
  }

  for (const path of includedSet) {
    expect(sourceSet.has(path)).toBe(true);
  }

  const union = new Set([...includedSet, ...ignoredSet]);
  expect([...union].sort((a, b) => a.localeCompare(b))).toEqual(
    [...sourceSet].sort((a, b) => a.localeCompare(b))
  );
}
