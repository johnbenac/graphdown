import { makeError, type ValidationError } from './errors';
import { extractWikiLinksFromFields, parseMarkdownRecord, RECORD_TYPE_ID_PATTERN } from './graph';
import type { RepoSnapshot } from './snapshotTypes';
import { getString, isObject } from './types';
import { extractWikiLinks } from './wikiLinks';

export type ValidateDatasetResult =
  | { ok: true }
  | { ok: false; errors: ValidationError[] };

type CompositionRequirement = {
  name: string;
  recordTypeId: string;
  min: number;
  max?: number;
};

const textDecoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8') : null;

function decodeBytes(raw: Uint8Array): string {
  if (textDecoder) {
    return textDecoder.decode(raw);
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(raw).toString('utf8');
  }
  return String.fromCharCode(...raw);
}

function listMarkdownFiles(files: string[], prefix: string, recursive: boolean): string[] {
  const prefixWithSlash = `${prefix}/`;
  return files.filter((file) => {
    if (!file.toLowerCase().endsWith('.md')) {
      return false;
    }
    if (!file.startsWith(prefixWithSlash)) {
      return false;
    }
    if (recursive) {
      return true;
    }
    const rest = file.slice(prefixWithSlash.length);
    return rest.length > 0 && !rest.includes('/');
  });
}

function listRecordDirs(files: string[]): string[] {
  const dirs = new Set<string>();
  for (const file of files) {
    if (!file.startsWith('records/')) {
      continue;
    }
    const parts = file.split('/');
    if (parts.length >= 3 && parts[1]) {
      dirs.add(parts[1]);
    }
  }
  return [...dirs].sort((a, b) => a.localeCompare(b));
}

function requireString(
  errors: ValidationError[],
  yaml: Record<string, unknown>,
  key: string,
  file: string,
  label?: string
): string | undefined {
  const value = getString(yaml, key);
  if (!value) {
    errors.push(makeError('E_REQUIRED_FIELD_MISSING', `${label ?? key} is required`, file));
    return undefined;
  }
  return value;
}

export function validateDatasetSnapshot(snapshot: RepoSnapshot): ValidateDatasetResult {
  const errors: ValidationError[] = [];
  const files = [...snapshot.files.keys()].sort((a, b) => a.localeCompare(b));

  const hasDir = (dir: string) => files.some((file) => file.startsWith(`${dir}/`));

  if (!hasDir('types')) {
    return { ok: false, errors: [makeError('E_DIR_MISSING', 'Missing required `types/` directory')] };
  }
  if (!hasDir('records')) {
    return { ok: false, errors: [makeError('E_DIR_MISSING', 'Missing required `records/` directory')] };
  }

  for (const file of files) {
    if (!file.startsWith('records/')) {
      continue;
    }
    const parts = file.split('/');
    const isRootLevel = parts.length === 2;
    const isMarkdown = file.toLowerCase().endsWith('.md');
    if (isRootLevel && isMarkdown) {
      errors.push(
        makeError(
          'E_UNKNOWN_RECORD_DIR',
          `Record files must be stored under records/<recordTypeId>/. Found ${file} directly under records/.`,
          file
        )
      );
    }
  }

  const typeFiles = listMarkdownFiles(files, 'types', true);
  const recordTypeIdMap = new Map<string, { id?: string; file: string }>();
  const compositionByRecordTypeId = new Map<string, CompositionRequirement[]>();
  const requiredFieldsByRecordTypeId = new Map<string, string[]>();
  const typeIds = new Set<string>();
  const typeRecords: Array<{ id?: string; file: string }> = [];

  for (const file of typeFiles) {
    const raw = snapshot.files.get(file);
    if (!raw) {
      continue;
    }
    const parsed = parseMarkdownRecord(decodeBytes(raw), file);
    if (!parsed.ok) {
      errors.push(parsed.error);
      continue;
    }
    const yaml = parsed.yaml;
    const id = requireString(errors, yaml, 'id', file, 'Type id');
    if (id && !id.startsWith('type:')) {
      errors.push(makeError('E_ID_PREFIX_INVALID', `Type file ${file} must have id beginning with "type:"`, file));
    }
    if (id) {
      if (typeIds.has(id)) {
        errors.push(makeError('E_DUPLICATE_ID', `Duplicate type id ${id}`, file));
      }
      typeIds.add(id);
    }

    const typeTypeId = requireString(errors, yaml, 'typeId', file, 'Type typeId');
    if (typeTypeId && typeTypeId !== 'sys:type') {
      errors.push(makeError('E_TYPEID_MISMATCH', `Type file ${file} typeId must be "sys:type"`, file));
    }

    requireString(errors, yaml, 'createdAt', file, 'Type createdAt');
    requireString(errors, yaml, 'updatedAt', file, 'Type updatedAt');

    if (!isObject(yaml.fields)) {
      errors.push(makeError('E_REQUIRED_FIELD_MISSING', `Type file ${file} fields must be an object`, file));
      continue;
    }
    const recordTypeId = getString(yaml.fields, 'recordTypeId');
    if (!recordTypeId) {
      errors.push(makeError('E_REQUIRED_FIELD_MISSING', `Type file ${file} fields must include recordTypeId`, file));
      continue;
    }
    if (!RECORD_TYPE_ID_PATTERN.test(recordTypeId)) {
      errors.push(
        makeError(
          'E_RECORD_TYPE_ID_INVALID',
          'Type recordTypeId must be a stable identifier (no spaces or "/")',
          file
        )
      );
      continue;
    }
    if (recordTypeIdMap.has(recordTypeId)) {
      errors.push(
        makeError('E_DUPLICATE_RECORD_TYPE_ID', `Multiple types define recordTypeId ${recordTypeId}`, file)
      );
    } else {
      recordTypeIdMap.set(recordTypeId, { id, file });
      const compositionRaw = (yaml.fields as Record<string, unknown>).composition;
      if (compositionRaw !== undefined) {
        if (!isObject(compositionRaw) || Array.isArray(compositionRaw)) {
          errors.push(
            makeError(
              'E_COMPOSITION_SCHEMA_INVALID',
              `Type file ${file} fields.composition must be a map keyed by component name.`,
              file
            )
          );
        } else {
          const parsedComponents: CompositionRequirement[] = [];
          for (const [name, value] of Object.entries(compositionRaw)) {
            if (!isObject(value) || Array.isArray(value)) {
              errors.push(
                makeError(
                  'E_COMPOSITION_SCHEMA_INVALID',
                  `Type file ${file} composition.${name} must be an object.`,
                  file
                )
              );
              continue;
            }
            const componentTypeId = getString(value, 'recordTypeId');
            if (!componentTypeId || !RECORD_TYPE_ID_PATTERN.test(componentTypeId)) {
              errors.push(
                makeError(
                  'E_COMPOSITION_SCHEMA_INVALID',
                  `Type file ${file} composition.${name}.recordTypeId must match the recordTypeId pattern.`,
                  file
                )
              );
              continue;
            }
            const minRaw = (value as Record<string, unknown>).min;
            let min = 1;
            if (minRaw !== undefined) {
              if (typeof minRaw === 'number' && Number.isInteger(minRaw) && minRaw >= 0) {
                min = minRaw;
              } else {
                errors.push(
                  makeError(
                    'E_COMPOSITION_SCHEMA_INVALID',
                    `Type file ${file} composition.${name}.min must be an integer >= 0.`,
                    file
                  )
                );
                continue;
              }
            }
            const maxRaw = (value as Record<string, unknown>).max;
            let max: number | undefined;
            if (maxRaw !== undefined) {
              if (typeof maxRaw === 'number' && Number.isInteger(maxRaw) && maxRaw >= min) {
                max = maxRaw;
              } else {
                errors.push(
                  makeError(
                    'E_COMPOSITION_SCHEMA_INVALID',
                    `Type file ${file} composition.${name}.max must be an integer >= min.`,
                    file
                  )
                );
                continue;
              }
            }
            parsedComponents.push({ name, recordTypeId: componentTypeId, min, max });
          }
          if (parsedComponents.length) {
            compositionByRecordTypeId.set(recordTypeId, parsedComponents);
          }
        }
      }
      const fieldDefs = isObject((yaml.fields as Record<string, unknown>).fieldDefs)
        ? (yaml.fields as Record<string, unknown>).fieldDefs
        : undefined;
      if (fieldDefs && !Array.isArray(fieldDefs)) {
        const required: string[] = [];
        for (const [fieldName, def] of Object.entries(fieldDefs)) {
          if (!isObject(def)) {
            continue;
          }
          if (def.required === true) {
            required.push(fieldName);
          }
        }
        if (required.length) {
          requiredFieldsByRecordTypeId.set(recordTypeId, required);
        }
      }
    }

    typeRecords.push({ id, file });
  }

  for (const [parentTypeId, components] of compositionByRecordTypeId.entries()) {
    const parentFile = recordTypeIdMap.get(parentTypeId)?.file;
    for (const component of components) {
      if (!recordTypeIdMap.has(component.recordTypeId)) {
        errors.push(
          makeError(
            'E_COMPOSITION_UNKNOWN_TYPE',
            `Type ${parentTypeId} composition "${component.name}" references unknown recordTypeId ${component.recordTypeId}.`,
            parentFile
          )
        );
      }
    }
  }

  const recordDirs = listRecordDirs(files);
  const recordEntries: Array<{ id?: string; file: string; recordTypeId: string }> = [];
  const recordTypeById = new Map<string, string>();
  const outgoingByRecordId = new Map<string, Set<string>>();

  for (const dirName of recordDirs) {
    if (!recordTypeIdMap.has(dirName)) {
      errors.push(
        makeError(
          'E_UNKNOWN_RECORD_DIR',
          `Unknown record type directory ${dirName}/ (no type definition for recordTypeId ${dirName})`
        )
      );
    }

    const recordFiles = listMarkdownFiles(files, `records/${dirName}`, true);
    for (const file of recordFiles) {
      const raw = snapshot.files.get(file);
      if (!raw) {
        continue;
      }
      const parsed = parseMarkdownRecord(decodeBytes(raw), file);
      if (!parsed.ok) {
        errors.push(parsed.error);
        continue;
      }
      const yaml = parsed.yaml;
      const id = requireString(errors, yaml, 'id', file, 'Record id');
      const recordTypeId = requireString(errors, yaml, 'typeId', file, 'Record typeId');
      if (recordTypeId && recordTypeId !== dirName) {
        errors.push(
          makeError(
            'E_TYPEID_MISMATCH',
            `Record file ${file} typeId ${recordTypeId} does not match its containing directory name ${dirName}`,
            file
          )
        );
      }
      requireString(errors, yaml, 'createdAt', file, 'Record createdAt');
      requireString(errors, yaml, 'updatedAt', file, 'Record updatedAt');
      if (!isObject(yaml.fields)) {
        errors.push(makeError('E_REQUIRED_FIELD_MISSING', `Record file ${file} fields must be an object`, file));
      } else {
        const requiredFields = requiredFieldsByRecordTypeId.get(dirName) ?? [];
        for (const fieldName of requiredFields) {
          const value = (yaml.fields as Record<string, unknown>)[fieldName];
          const missing =
            value === undefined ||
            value === null ||
            (typeof value === 'string' && value.trim().length === 0);
          if (missing) {
            errors.push(
              makeError(
                'E_REQUIRED_FIELD_MISSING',
                `Record file ${file} is missing required field "${fieldName}" from type definition`,
                file
              )
            );
          }
        }
      }

      if (id) {
        recordTypeById.set(id, dirName);
        if (compositionByRecordTypeId.has(dirName)) {
          const targets = new Set<string>();
          for (const target of extractWikiLinksFromFields(yaml.fields)) {
            targets.add(target);
          }
          for (const target of extractWikiLinks(parsed.body)) {
            targets.add(target);
          }
          targets.delete(id);
          outgoingByRecordId.set(id, targets);
        }
      }

      recordEntries.push({ id, file, recordTypeId: dirName });
    }
  }

  const seenIds = new Set<string>();
  const recordDuplicate = (id: string | undefined, file: string) => {
    if (!id) {
      return;
    }
    if (seenIds.has(id)) {
      errors.push(makeError('E_DUPLICATE_ID', `Duplicate id detected: ${id} (in ${file})`, file));
      return;
    }
    seenIds.add(id);
  };

  for (const type of typeRecords) {
    recordDuplicate(type.id, type.file);
  }
  for (const record of recordEntries) {
    recordDuplicate(record.id, record.file);
  }

  for (const record of recordEntries) {
    if (!record.id) {
      continue;
    }
    const components = compositionByRecordTypeId.get(record.recordTypeId);
    if (!components || components.length === 0) {
      continue;
    }
    const outgoing = outgoingByRecordId.get(record.id) ?? new Set<string>();
    for (const component of components) {
      const matches = [...outgoing].filter(
        (targetId) => recordTypeById.get(targetId) === component.recordTypeId
      );
      if (matches.length < component.min) {
        errors.push(
          makeError(
            'E_COMPOSITION_CONSTRAINT_VIOLATION',
            `Record ${record.id} must link to at least ${component.min} ${component.recordTypeId} record(s) for component "${component.name}". Found ${matches.length}.`,
            record.file
          )
        );
      }
      if (component.max !== undefined && matches.length > component.max) {
        errors.push(
          makeError(
            'E_COMPOSITION_CONSTRAINT_VIOLATION',
            `Record ${record.id} must link to at most ${component.max} ${component.recordTypeId} record(s) for component "${component.name}". Found ${matches.length}.`,
            record.file
          )
        );
      }
    }
  }

  if (errors.length) {
    return { ok: false, errors };
  }

  return {
    ok: true
  };
}
