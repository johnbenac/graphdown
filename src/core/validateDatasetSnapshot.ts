import {
  computeBlobDigest,
  discoverGraphdownObjects,
  IDENTIFIER_PATTERN,
  type ParsedRecordObject,
  type ParsedTypeObject,
} from './datasetObjects';
import { makeError, type ValidationError } from './errors';
import type { RepoSnapshot } from './snapshotTypes';
import { isObject } from './types';
import { extractBlobRefs, extractRecordRefs } from './wikiLinks';

export type ValidateDatasetResult =
  | { ok: true }
  | { ok: false; errors: ValidationError[] };

type CompositionComponent = { typeId: string; required: boolean };

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function collectStringValues(value: unknown, into: Set<string>): void {
  if (typeof value === 'string') {
    into.add(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectStringValues(item, into);
    }
    return;
  }
  if (isObject(value)) {
    for (const child of Object.values(value)) {
      collectStringValues(child, into);
    }
  }
}

function enforceFieldDefs(
  typeObj: ParsedTypeObject,
  records: ParsedRecordObject[],
  errors: ValidationError[]
): void {
  const fieldDefsRaw = (typeObj.fields as Record<string, unknown>).fieldDefs;
  if (fieldDefsRaw === undefined) {
    return;
  }
  if (!isObject(fieldDefsRaw)) {
    errors.push(
      makeError(
        'E_REQUIRED_FIELD_MISSING',
        `Type ${typeObj.typeId} fields.fieldDefs must be a map keyed by field name`,
        typeObj.file
      )
    );
    return;
  }
  const requiredFields: string[] = [];
  for (const [fieldName, def] of Object.entries(fieldDefsRaw)) {
    if (!isObject(def)) {
      errors.push(
        makeError(
          'E_REQUIRED_FIELD_MISSING',
          `Type ${typeObj.typeId} fields.fieldDefs.${fieldName} must be an object`,
          typeObj.file
        )
      );
      continue;
    }
    if ('required' in def && typeof def.required !== 'boolean') {
      errors.push(
        makeError(
          'E_REQUIRED_FIELD_MISSING',
          `Type ${typeObj.typeId} fields.fieldDefs.${fieldName}.required must be boolean when present`,
          typeObj.file
        )
      );
    }
    if (def.required === true) {
      requiredFields.push(fieldName);
    }
  }

  if (requiredFields.length === 0) {
    return;
  }

  for (const record of records) {
    for (const fieldName of requiredFields) {
      const value = (record.fields as Record<string, unknown>)[fieldName];
      const missing =
        value === undefined ||
        value === null ||
        (typeof value === 'string' && value.trim().length === 0);
      if (missing) {
        errors.push(
          makeError(
            'E_REQUIRED_FIELD_MISSING',
            `Record ${record.identity} is missing required field "${fieldName}"`,
            record.file
          )
        );
      }
    }
  }
}

function enforceCompositionShape(typeObj: ParsedTypeObject, errors: ValidationError[]): CompositionComponent[] {
  const compositionRaw = (typeObj.fields as Record<string, unknown>).composition;
  if (compositionRaw === undefined) {
    return [];
  }
  if (!isObject(compositionRaw)) {
    errors.push(
      makeError(
        'E_COMPOSITION_SCHEMA_INVALID',
        `Type ${typeObj.typeId} fields.composition must be a map keyed by component name.`,
        typeObj.file
      )
    );
    return [];
  }
  const components: CompositionComponent[] = [];
  for (const [name, value] of Object.entries(compositionRaw)) {
    if (!isObject(value) || Array.isArray(value)) {
      errors.push(
        makeError(
          'E_COMPOSITION_SCHEMA_INVALID',
          `Type ${typeObj.typeId} composition.${name} must be an object.`,
          typeObj.file
        )
      );
      continue;
    }
    const typeId = value.typeId;
    if (typeof typeId !== 'string' || !IDENTIFIER_PATTERN.test(typeId)) {
      errors.push(
        makeError(
          'E_COMPOSITION_SCHEMA_INVALID',
          `Type ${typeObj.typeId} composition.${name}.typeId must satisfy ID-001`,
          typeObj.file
        )
      );
      continue;
    }
    if (!Object.prototype.hasOwnProperty.call(value, 'required')) {
      errors.push(
        makeError(
          'E_COMPOSITION_SCHEMA_INVALID',
          `Type ${typeObj.typeId} composition.${name} must define required: boolean`,
          typeObj.file
        )
      );
      continue;
    }
    if (typeof value.required !== 'boolean') {
      errors.push(
        makeError(
          'E_COMPOSITION_SCHEMA_INVALID',
          `Type ${typeObj.typeId} composition.${name}.required must be boolean`,
          typeObj.file
        )
      );
      continue;
    }
    const allowedKeys = new Set(['typeId', 'required']);
    const extra = Object.keys(value).find((k) => !allowedKeys.has(k));
    if (extra) {
      errors.push(
        makeError(
          'E_COMPOSITION_SCHEMA_INVALID',
          `Type ${typeObj.typeId} composition.${name} contains forbidden key "${extra}"`,
          typeObj.file
        )
      );
      continue;
    }
    components.push({ typeId, required: value.required === true });
  }
  return components;
}

function validateBlobStore(
  snapshot: RepoSnapshot,
  records: ParsedRecordObject[],
  errors: ValidationError[]
): void {
  const blobFiles = [...snapshot.files.keys()].filter((p) => p.startsWith('blobs/sha256/'));
  const digestToPath = new Map<string, string>();

  for (const path of blobFiles) {
    const parts = path.split('/');
    if (parts.length !== 4) {
      errors.push(makeError('E_BLOB_PATH_INVALID', `Invalid blob path ${path}`, path));
      continue;
    }
    const [, algo, prefix, filename] = parts;
    if (algo !== 'sha256') {
      errors.push(makeError('E_BLOB_PATH_INVALID', `Invalid blob algorithm segment in ${path}`, path));
      continue;
    }
    if (prefix.length !== 2) {
      errors.push(makeError('E_BLOB_PATH_INVALID', `Invalid blob prefix ${prefix} in ${path}`, path));
      continue;
    }
    if (!/^[0-9a-f]{64}$/.test(filename)) {
      errors.push(makeError('E_BLOB_PATH_INVALID', `Blob filename must be 64 hex chars in ${path}`, path));
      continue;
    }
    if (filename.slice(0, 2) !== prefix) {
      errors.push(makeError('E_BLOB_PATH_INVALID', `Blob prefix ${prefix} does not match digest ${filename}`, path));
      continue;
    }
    const bytes = snapshot.files.get(path);
    if (!bytes) {
      continue;
    }
    const digest = computeBlobDigest(bytes);
    if (digest !== filename) {
      errors.push(
        makeError('E_BLOB_DIGEST_MISMATCH', `Blob file ${path} digest does not match its filename`, path)
      );
      continue;
    }
    digestToPath.set(digest, path);
  }

  const referencedDigests = new Set<string>();
  for (const record of records) {
    const strings = new Set<string>();
    collectStringValues(record.fields, strings);
    collectStringValues(record.body, strings);
    for (const digest of extractBlobRefs([...strings].join('\n'))) {
      referencedDigests.add(digest);
      if (!digestToPath.has(digest)) {
        errors.push(
          makeError(
            'E_BLOB_REFERENCE_MISSING',
            `Blob ${digest} referenced from ${record.identity} is missing`,
            record.file
          )
        );
      }
    }
  }

  // referencedDigests used for GC/export; no validity failure for garbage blobs.
}

function collectRecordRefsFromRecord(record: ParsedRecordObject): Set<string> {
  const refs = new Set<string>();
  const strings = new Set<string>();
  collectStringValues(record.fields, strings);
  collectStringValues(record.body, strings);
  for (const ref of extractRecordRefs([...strings].join('\n'))) {
    refs.add(ref);
  }
  return refs;
}

export function validateDatasetSnapshot(snapshot: RepoSnapshot): ValidateDatasetResult {
  const errors: ValidationError[] = [];

  const parsed = discoverGraphdownObjects(snapshot);
  if (parsed.errors.length) {
    return { ok: false, errors: parsed.errors };
  }

  const typesById = new Map<string, ParsedTypeObject>();
  for (const typeObj of parsed.typeObjects) {
    if (typesById.has(typeObj.typeId)) {
      errors.push(makeError('E_DUPLICATE_ID', `Duplicate typeId ${typeObj.typeId}`, typeObj.file));
    } else {
      typesById.set(typeObj.typeId, typeObj);
    }
  }

  const recordsByKey = new Map<string, ParsedRecordObject>();
  const recordsByTypeId = new Map<string, ParsedRecordObject[]>();
  for (const record of parsed.recordObjects) {
    if (recordsByKey.has(record.identity)) {
      errors.push(makeError('E_DUPLICATE_ID', `Duplicate record identity ${record.identity}`, record.file));
    } else {
      recordsByKey.set(record.identity, record);
    }
    const list = recordsByTypeId.get(record.typeId) ?? [];
    list.push(record);
    recordsByTypeId.set(record.typeId, list);
  }

  for (const record of parsed.recordObjects) {
    if (!typesById.has(record.typeId)) {
      errors.push(
        makeError(
          'E_TYPEID_MISMATCH',
          `Record ${record.identity} references missing typeId ${record.typeId}`,
          record.file
        )
      );
    }
  }

  for (const typeObj of parsed.typeObjects) {
    const records = recordsByTypeId.get(typeObj.typeId) ?? [];
    enforceFieldDefs(typeObj, records, errors);
    const components = enforceCompositionShape(typeObj, errors);
    for (const component of components) {
      if (!typesById.has(component.typeId)) {
        errors.push(
          makeError(
            'E_COMPOSITION_UNKNOWN_TYPE',
            `Type ${typeObj.typeId} composition references missing typeId ${component.typeId}`,
            typeObj.file
          )
        );
        continue;
      }
      if (!component.required) {
        continue;
      }
      for (const record of records) {
        const refs = collectRecordRefsFromRecord(record);
        const matches = [...refs].filter((ref) => recordsByKey.has(ref) && recordsByKey.get(ref)!.typeId === component.typeId);
        if (matches.length === 0) {
          errors.push(
            makeError(
              'E_COMPOSITION_CONSTRAINT_VIOLATION',
              `Record ${record.identity} must link to at least one ${component.typeId} to satisfy composition "${component.typeId}"`,
              record.file
            )
          );
        }
      }
    }
  }

  validateBlobStore(snapshot, parsed.recordObjects, errors);

  if (errors.length) {
    return { ok: false, errors };
  }

  return { ok: true };
}
