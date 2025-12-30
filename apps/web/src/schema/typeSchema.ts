import { cleanId } from "../../../../src/core/ids";
import { isObject } from "../../../../src/core/types";

export type FieldDef = {
  name: string;
  kind: string;
  required?: boolean;
  [key: string]: unknown;
};

export type TypeSchema = {
  bodyField?: string;
  fields: FieldDef[];
};

export type ParseSchemaResult = { ok: true; schema: TypeSchema } | { ok: false; message: string };

export function parseTypeSchema(
  fields: Record<string, unknown> | undefined
): ParseSchemaResult {
  const bodyField = typeof fields?.bodyField === "string" ? fields.bodyField : undefined;
  const rawDefs = fields?.fieldDefs;
  if (rawDefs == null) {
    return { ok: true, schema: { bodyField, fields: [] } };
  }
  if (!isObject(rawDefs)) {
    return { ok: false, message: "fieldDefs must be a map of field definitions." };
  }
  const parsed: FieldDef[] = [];
  for (const [name, item] of Object.entries(rawDefs)) {
    if (!isObject(item)) {
      return { ok: false, message: "Each field definition must be an object." };
    }
    const kind = typeof item.kind === "string" ? item.kind : undefined;
    if (!name || !kind) {
      return { ok: false, message: "Each field definition requires a name and kind." };
    }
    const { kind: _kind, required, ...rest } = item;
    parsed.push({
      ...rest,
      name,
      kind,
      ...(typeof required === "boolean" ? { required } : {})
    });
  }
  return { ok: true, schema: { bodyField, fields: parsed } };
}

function normalizeId(value: unknown): string | null {
  return cleanId(value);
}

export function readRef(value: unknown): string {
  const direct = normalizeId(value);
  if (direct) {
    return direct;
  }
  if (isObject(value)) {
    const inner = normalizeId(value.ref);
    if (inner) {
      return inner;
    }
  }
  return "";
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

export function writeRef(id: string): { ref: string } | undefined {
  const cleaned = normalizeId(id);
  if (!cleaned) {
    return undefined;
  }
  return { ref: cleaned };
}

export function writeRefs(ids: string[]): { refs: string[] } | undefined {
  const cleaned = ids.map((id) => normalizeId(id)).filter((id): id is string => Boolean(id));
  if (!cleaned.length) {
    return undefined;
  }
  return { refs: cleaned };
}
