export type RecordFields = Record<string, unknown>;

export interface MarkdownTypeObject {
  typeId: string;
  fields: RecordFields;
}

export interface MarkdownRecordObject {
  typeId: string;
  recordId: string;
  fields: RecordFields;
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function getString(obj: Record<string, unknown>, key: string): string | undefined {
  const value = obj[key];
  return typeof value === 'string' ? value : undefined;
}
