import { cleanId } from "../../../../src/core/ids";
import { isObject } from "../../../../src/core/types";

export type FieldKind = string;

export type FieldDef = {
  name: string;
  kind: FieldKind;
  label?: unknown;
  required?: boolean;
  options?: unknown;
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
  if (!isObject(rawDefs) || Array.isArray(rawDefs)) {
    return { ok: false, message: "fieldDefs must be a map of field definitions." };
  }
  const parsed: FieldDef[] = [];
  for (const [name, value] of Object.entries(rawDefs)) {
    if (!isObject(value)) {
      return { ok: false, message: "Each field definition must be an object." };
    }
    const kind = typeof value.kind === "string" ? (value.kind as FieldKind) : undefined;
    if (!kind) {
      return { ok: false, message: "Each field definition requires a kind string." };
    }
    const extras = { ...value };
    delete extras.kind;
    delete extras.required;
    delete extras.name;
    parsed.push({
      name,
      kind,
      required: typeof value.required === "boolean" ? value.required : undefined,
      ...extras
    });
  }
  return { ok: true, schema: { bodyField, fields: parsed } };
}

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
