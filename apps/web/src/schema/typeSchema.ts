import { cleanId } from "../../../../src/core/ids";
import type { GraphTypeDef } from "../../../../src/core/graph";

export type FieldKind = "string" | "number" | "enum" | "date" | "ref" | "ref[]";

export type FieldDef = {
  name: string;
  kind: FieldKind;
  label?: string;
  required?: boolean;
  options?: string[];
};

export type TypeSchema = {
  bodyField?: string;
  fields: FieldDef[];
};

type SchemaResult = { ok: true; schema: TypeSchema } | { ok: false; message: string };

const allowedKinds: FieldKind[] = ["string", "number", "enum", "date", "ref", "ref[]"];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseFieldDef(raw: unknown): FieldDef | null {
  if (!isObject(raw)) {
    return null;
  }
  const name = typeof raw.name === "string" ? raw.name : null;
  const kind = typeof raw.kind === "string" ? raw.kind : null;
  if (!name || !kind || !allowedKinds.includes(kind as FieldKind)) {
    return null;
  }
  const label = typeof raw.label === "string" ? raw.label : undefined;
  const required = typeof raw.required === "boolean" ? raw.required : undefined;
  const options = Array.isArray(raw.options) ? raw.options.filter((option) => typeof option === "string") : undefined;
  return { name, kind: kind as FieldKind, label, required, options };
}

export function parseTypeSchema(typeDef: GraphTypeDef): SchemaResult {
  const fields = typeDef.fields ?? {};
  const bodyField = typeof fields.bodyField === "string" ? fields.bodyField : undefined;
  const rawFieldDefs = fields.fieldDefs;
  if (rawFieldDefs === undefined) {
    return { ok: true, schema: { bodyField, fields: [] } };
  }
  if (!Array.isArray(rawFieldDefs)) {
    return { ok: false, message: "fieldDefs must be an array of field definitions." };
  }
  const parsed: FieldDef[] = [];
  for (const raw of rawFieldDefs) {
    const fieldDef = parseFieldDef(raw);
    if (!fieldDef) {
      return { ok: false, message: "Each field definition requires a name and supported kind." };
    }
    if (fieldDef.kind === "enum" && (!fieldDef.options || fieldDef.options.length === 0)) {
      return { ok: false, message: `Enum field "${fieldDef.name}" must define options.` };
    }
    parsed.push(fieldDef);
  }
  return { ok: true, schema: { bodyField, fields: parsed } };
}

export function readRef(value: unknown): string {
  if (typeof value === "string") {
    return cleanId(value) ?? "";
  }
  if (isObject(value) && typeof value.ref === "string") {
    return cleanId(value.ref) ?? "";
  }
  return "";
}

export function readRefs(value: unknown): string[] {
  if (typeof value === "string") {
    const cleaned = cleanId(value);
    return cleaned ? [cleaned] : [];
  }
  if (Array.isArray(value)) {
    return value.map((item) => cleanId(item)).filter((item): item is string => Boolean(item));
  }
  if (isObject(value) && Array.isArray(value.refs)) {
    return value.refs
      .map((item) => cleanId(item))
      .filter((item): item is string => Boolean(item));
  }
  return [];
}

export function writeRef(id: string): { ref: string } | undefined {
  const cleaned = cleanId(id);
  if (!cleaned) {
    return undefined;
  }
  return { ref: cleaned };
}

export function writeRefs(ids: string[]): { refs: string[] } | undefined {
  const cleaned = ids.map((id) => cleanId(id)).filter((id): id is string => Boolean(id));
  if (!cleaned.length) {
    return undefined;
  }
  return { refs: cleaned };
}
