export function cleanId(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  let trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const wrappedMatch = trimmed.match(/^\[\[(.*)\]\]$/);
  if (wrappedMatch) {
    trimmed = wrappedMatch[1].trim();
  }
  if (!trimmed) {
    return null;
  }
  return trimmed;
}
