export function computeIgnoredPaths(
  sourcePaths: Iterable<string>,
  includedPaths: Iterable<string>
): string[] {
  const included = new Set(includedPaths);
  const ignored = new Set<string>();

  for (const path of sourcePaths) {
    if (!included.has(path)) ignored.add(path);
  }

  return [...ignored].sort((a, b) => a.localeCompare(b));
}
