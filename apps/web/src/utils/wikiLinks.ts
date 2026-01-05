import { cleanId } from "../core/ids";
import { isObject } from "../core/types";

function normalizeId(value: unknown): string | null {
  return cleanId(value);
}

export function readRef(value: unknown): string {
  const normalized =
    normalizeId(value) || (isObject(value) ? normalizeId(value.ref) : null);
  return normalized ?? "";
}

export function readRefs(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeId(item)).filter((item): item is string => Boolean(item));
  }
  if (isObject(value) && Array.isArray(value.refs)) {
    return value.refs
      .map((item) => normalizeId(item))
      .filter((item): item is string => Boolean(item));
  }
  const single = normalizeId(value);
  return single ? [single] : [];
}

export function writeRef(id: string): string | undefined {
  const cleaned = normalizeId(id);
  if (!cleaned) {
    return undefined;
  }
  return `[[${cleaned}]]`;
}

export function writeRefs(ids: string[]): string[] | undefined {
  const cleaned = ids.map((id) => normalizeId(id)).filter((id): id is string => Boolean(id));
  if (!cleaned.length) {
    return undefined;
  }
  return cleaned.map((value) => `[[${value}]]`);
}
