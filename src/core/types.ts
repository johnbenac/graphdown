export type RecordFields = Record<string, unknown>;

export interface RecordEnvelope {
  id: string;
  typeId: string;
  createdAt: string;
  updatedAt: string;
  fields: RecordFields;
}

export type TypeRecord = RecordEnvelope & { typeId: 'sys:type' };

export type DataRecord = RecordEnvelope;

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function getString(obj: Record<string, unknown>, key: string): string | undefined {
  const value = obj[key];
  return typeof value === 'string' ? value : undefined;
}
