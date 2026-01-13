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

export const SAFE_IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

export function isValidPluginId(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (value.trim().length === 0) return false;
  return SAFE_IDENTIFIER_PATTERN.test(value);
}
