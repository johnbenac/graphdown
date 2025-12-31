import { makeError, type ValidationError } from './errors';
import { parseMarkdownRecord, RECORD_TYPE_ID_PATTERN } from './graph';
import type { RepoSnapshot } from './snapshotTypes';
import { getString, isObject } from './types';

export type ValidateDatasetResult =
  | { ok: true; datasetRecordPath: string; datasetId: string }
  | { ok: false; errors: ValidationError[] };

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

  if (!hasDir('datasets')) {
    return { ok: false, errors: [makeError('E_DIR_MISSING', 'Missing required `datasets/` directory')] };
  }
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

  const datasetFilesRecursive = listMarkdownFiles(files, 'datasets', true);
  const datasetFiles = listMarkdownFiles(files, 'datasets', false);
  const nestedDatasetFiles = datasetFilesRecursive.filter((file) => !datasetFiles.includes(file));
  if (datasetFiles.length !== 1 || nestedDatasetFiles.length > 0) {
    const message =
      datasetFilesRecursive.length === 0
        ? 'Expected exactly one Markdown file in datasets/, found 0'
        : `Dataset manifest must be a single Markdown file directly under datasets/. Found: ${datasetFilesRecursive.join(
            ', '
          )}`;
    return {
      ok: false,
      errors: [makeError('E_DATASET_FILE_COUNT', message)]
    };
  }

  const datasetFile = datasetFiles[0];
  const datasetRaw = snapshot.files.get(datasetFile);
  if (!datasetRaw) {
    return { ok: false, errors: [makeError('E_INTERNAL', `Missing dataset file ${datasetFile}`)] };
  }

  const parsedDataset = parseMarkdownRecord(decodeBytes(datasetRaw), datasetFile);
  if (!parsedDataset.ok) {
    return { ok: false, errors: [parsedDataset.error] };
  }

  const datasetYaml = parsedDataset.yaml;
  const datasetId = requireString(errors, datasetYaml, 'id', datasetFile, 'Dataset id');

  const datasetDatasetId = requireString(
    errors,
    datasetYaml,
    'datasetId',
    datasetFile,
    'Dataset datasetId'
  );
  if (datasetId && datasetDatasetId && datasetDatasetId !== datasetId) {
    errors.push(
      makeError('E_DATASET_ID_MISMATCH', 'Dataset file datasetId must equal its id', datasetFile)
    );
  }

  const datasetTypeId = requireString(errors, datasetYaml, 'typeId', datasetFile, 'Dataset typeId');
  if (datasetTypeId && datasetTypeId !== 'sys:dataset') {
    errors.push(makeError('E_TYPEID_MISMATCH', 'Dataset file typeId must be "sys:dataset"', datasetFile));
  }

  requireString(errors, datasetYaml, 'createdAt', datasetFile, 'Dataset createdAt');
  requireString(errors, datasetYaml, 'updatedAt', datasetFile, 'Dataset updatedAt');

  if (!isObject(datasetYaml.fields)) {
    errors.push(makeError('E_REQUIRED_FIELD_MISSING', 'Dataset file fields must be an object', datasetFile));
  }

  const typeFiles = listMarkdownFiles(files, 'types', true);
  const recordTypeIdMap = new Map<string, { id?: string; file: string }>();
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

    const typeDatasetId = requireString(errors, yaml, 'datasetId', file, 'Type datasetId');
    if (datasetId && typeDatasetId && typeDatasetId !== datasetId) {
      errors.push(
        makeError(
          'E_DATASET_ID_MISMATCH',
          `Type file ${file} has datasetId ${typeDatasetId} but dataset id is ${datasetId}`,
          file
        )
      );
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
    }

    typeRecords.push({ id, file });
  }

  const recordDirs = listRecordDirs(files);
  const recordEntries: Array<{ id?: string; file: string }> = [];

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
      const recordDatasetId = requireString(errors, yaml, 'datasetId', file, 'Record datasetId');
      if (datasetId && recordDatasetId && recordDatasetId !== datasetId) {
        errors.push(
          makeError(
            'E_DATASET_ID_MISMATCH',
            `Record file ${file} datasetId mismatch: expected ${datasetId}, found ${recordDatasetId}`,
            file
          )
        );
      }
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
      }

      recordEntries.push({ id, file });
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

  recordDuplicate(datasetId, datasetFile);
  for (const type of typeRecords) {
    recordDuplicate(type.id, type.file);
  }
  for (const record of recordEntries) {
    recordDuplicate(record.id, record.file);
  }

  if (errors.length) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    datasetRecordPath: datasetFile,
    datasetId: datasetId ?? ''
  };
}
