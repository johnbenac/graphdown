export function cleanId(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  let cleaned = value.trim();
  if (!cleaned) {
    return null;
  }
  const match = cleaned.match(/^\[\[(.*)\]\]$/);
  if (match) {
    cleaned = match[1].trim();
  }
  return cleaned || null;
}
