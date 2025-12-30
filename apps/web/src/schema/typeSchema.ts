import { cleanId } from "../../../../src/core/ids";
import { isObject } from "../../../../src/core/types";

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

const fieldKinds: FieldKind[] = ["string", "number", "enum", "date", "ref", "ref[]"];

export function parseTypeSchema(fields: Record<string, unknown> | undefined): {
  ok: true;
  schema: TypeSchema;
} | {
  ok: false;
  message: string;
} {
  if (!fields || !isObject(fields)) {
    return { ok: true, schema: { fields: [] } };
  }

  const bodyField = fields.bodyField;
  if (bodyField !== undefined && typeof bodyField !== "string") {
    return { ok: false, message: "Type schema bodyField must be a string." };
  }

  const fieldDefsRaw = fields.fieldDefs;
  if (fieldDefsRaw === undefined) {
    return {
      ok: true,
      schema: {
        bodyField: bodyField ?? undefined,
        fields: []
      }
    };
  }

  if (!Array.isArray(fieldDefsRaw)) {
    return { ok: false, message: "Type schema fieldDefs must be an array." };
  }

  const parsedFields: FieldDef[] = [];
  for (const entry of fieldDefsRaw) {
    if (!isObject(entry)) {
      return { ok: false, message: "Type schema fieldDefs must be objects." };
    }
    const name = entry.name;
    if (typeof name !== "string" || !name.trim()) {
      return { ok: false, message: "Type schema fieldDefs name must be a string." };
    }
    const kind = entry.kind;
    if (typeof kind !== "string" || !fieldKinds.includes(kind as FieldKind)) {
      return { ok: false, message: `Type schema fieldDefs kind "${String(kind)}" is invalid.` };
    }
    const label = typeof entry.label === "string" ? entry.label : undefined;
    const required = typeof entry.required === "boolean" ? entry.required : undefined;
    const options =
      Array.isArray(entry.options) && entry.options.every((option) => typeof option === "string")
        ? entry.options
        : undefined;

    if (kind === "enum" && (!options || options.length === 0)) {
      return { ok: false, message: `Type schema fieldDefs "${name}" must define enum options.` };
    }

    parsedFields.push({ name, kind: kind as FieldKind, label, required, options });
  }

  return { ok: true, schema: { bodyField: bodyField ?? undefined, fields: parsedFields } };
}

export function readRef(value: unknown): string {
  if (typeof value === "string") {
    return cleanId(value) ?? value.trim();
  }
  if (isObject(value) && typeof value.ref === "string") {
    return cleanId(value.ref) ?? value.ref.trim();
  }
  return "";
}

export function readRefs(value: unknown): string[] {
  const values: unknown[] = [];
  if (Array.isArray(value)) {
    values.push(...value);
  } else if (typeof value === "string") {
    values.push(value);
  } else if (isObject(value) && Array.isArray(value.refs)) {
    values.push(...value.refs);
  }
  return values
    .map((entry) => (typeof entry === "string" ? cleanId(entry) ?? entry.trim() : ""))
    .filter((entry) => entry.length > 0);
}

export function writeRef(value: string): { ref: string } | undefined {
  const cleaned = cleanId(value) ?? value.trim();
  if (!cleaned) {
    return undefined;
  }
  return { ref: cleaned };
}

export function writeRefs(values: string[]): { refs: string[] } | undefined {
  const cleaned = values
    .map((entry) => cleanId(entry) ?? entry.trim())
    .filter((entry) => entry.length > 0);
  if (!cleaned.length) {
    return undefined;
  }
  return { refs: cleaned };
}
