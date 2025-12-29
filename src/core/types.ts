export type RecordFields = Record<string, unknown>;

export interface BaseRecord {
  id: string;
  datasetId: string;
  typeId: string;
  createdAt: string;
  updatedAt: string;
  fields: RecordFields;
}

export interface DatasetRecord extends BaseRecord {
  typeId: 'sys:dataset';
  fields: {
    name: string;
    description: string;
    [k: string]: unknown;
  };
}

export interface TypeRecord extends BaseRecord {
  typeId: 'sys:type';
  fields: {
    recordTypeId: string;
    displayName?: string;
    pluralName?: string;
    fieldDefs?: Record<string, unknown>;
    [k: string]: unknown;
  };
}

export interface DataRecord extends BaseRecord {
  // typeId is the record type directory name
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function getString(obj: Record<string, unknown>, key: string): string | undefined {
  const value = obj[key];
  return typeof value === 'string' ? value : undefined;
}
