import { cleanId } from './ids';

export function normalizeRef(value: unknown): string | null {
  return cleanId(value);
}

export function normalizeRefs(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(normalizeRef).filter((ref): ref is string => Boolean(ref));
  }
  const ref = normalizeRef(value);
  return ref ? [ref] : [];
}
