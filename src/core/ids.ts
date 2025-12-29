export function cleanId(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  let trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const match = trimmed.match(/^\[\[(.*)\]\]$/);
  if (match) {
    trimmed = match[1].trim();
  }
  return trimmed ? trimmed : null;
}
