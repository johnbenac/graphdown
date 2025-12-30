import { cleanId } from "../../../../src/core/ids";
import type { GraphTypeDef } from "../../../../src/core/graph";
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

type SchemaParseResult = { ok: true; schema: TypeSchema } | { ok: false; message: string };

const FIELD_KINDS: FieldKind[] = ["string", "number", "enum", "date", "ref", "ref[]"];

export function parseTypeSchema(typeDef?: GraphTypeDef | null): SchemaParseResult {
  const fields = typeDef?.fields;
  if (!fields) {
    return { ok: true, schema: { fields: [] } };
  }

  const bodyFieldRaw = fields.bodyField;
  if (bodyFieldRaw !== undefined && typeof bodyFieldRaw !== "string") {
    return { ok: false, message: "bodyField must be a string." };
  }

  const rawFieldDefs = fields.fieldDefs;
  if (rawFieldDefs === undefined) {
    return { ok: true, schema: { bodyField: bodyFieldRaw as string | undefined, fields: [] } };
  }
  if (!Array.isArray(rawFieldDefs)) {
    return { ok: false, message: "fieldDefs must be a list of field definitions." };
  }

  const parsedFieldDefs: FieldDef[] = [];
  for (const entry of rawFieldDefs) {
    if (!isObject(entry)) {
      return { ok: false, message: "Each field definition must be an object." };
    }
    const name = entry.name;
    const kind = entry.kind;
    if (typeof name !== "string" || !name.trim()) {
      return { ok: false, message: "Each field definition needs a non-empty name." };
    }
    if (typeof kind !== "string" || !FIELD_KINDS.includes(kind as FieldKind)) {
      return { ok: false, message: `Field ${name} must have a supported kind.` };
    }
    const def: FieldDef = {
      name: name.trim(),
      kind: kind as FieldKind
    };
    if (typeof entry.label === "string" && entry.label.trim()) {
      def.label = entry.label.trim();
    }
    if (typeof entry.required === "boolean") {
      def.required = entry.required;
    }
    if (def.kind === "enum") {
      if (!Array.isArray(entry.options) || !entry.options.every((option) => typeof option === "string")) {
        return { ok: false, message: `Field ${name} must define string options.` };
      }
      def.options = entry.options;
    } else if (Array.isArray(entry.options)) {
      def.options = entry.options.filter((option) => typeof option === "string");
    }
    parsedFieldDefs.push(def);
  }

  return { ok: true, schema: { bodyField: bodyFieldRaw as string | undefined, fields: parsedFieldDefs } };
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
  if (Array.isArray(value)) {
    return value.map((entry) => cleanId(entry)).filter((entry): entry is string => Boolean(entry));
  }
  if (typeof value === "string") {
    const cleaned = cleanId(value);
    return cleaned ? [cleaned] : [];
  }
  if (isObject(value) && Array.isArray(value.refs)) {
    return value.refs
      .map((entry) => cleanId(entry))
      .filter((entry): entry is string => Boolean(entry));
  }
  return [];
}

export function writeRef(value: string): { ref: string } | undefined {
  const cleaned = cleanId(value);
  if (!cleaned) {
    return undefined;
  }
  return { ref: cleaned };
}

export function writeRefs(values: string[]): { refs: string[] } | undefined {
  const cleaned = values.map((entry) => cleanId(entry)).filter((entry): entry is string => Boolean(entry));
  if (!cleaned.length) {
    return undefined;
  }
  return { refs: cleaned };
}
