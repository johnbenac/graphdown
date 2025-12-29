import { cleanId } from './ids';

export function normalizeRef(value: unknown): string | null {
  return cleanId(value);
}

export function normalizeRefs(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(cleanId).filter((id): id is string => Boolean(id));
  }
  const single = cleanId(value);
  return single ? [single] : [];
}
