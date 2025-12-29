import { makeError, type ValidationError } from './errors';
import { parseMarkdownRecord } from './graph';
import type { RepoSnapshot } from './snapshotTypes';
import { decodeUtf8 } from './text';
import { getString, isObject } from './types';

export type ValidateDatasetResult =
  | { ok: true; datasetRecordPath: string; datasetId: string }
  | { ok: false; errors: ValidationError[] };

const RECORD_TYPE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

function listMarkdownFiles(snapshot: RepoSnapshot, prefix: string): string[] {
  const files: string[] = [];
  for (const file of snapshot.files.keys()) {
    if (file.startsWith(prefix) && file.toLowerCase().endsWith('.md')) {
      files.push(file);
    }
  }
  return files;
}

function listDatasetFiles(snapshot: RepoSnapshot): string[] {
  const files: string[] = [];
  for (const file of snapshot.files.keys()) {
    if (/^datasets\/[^/]+\.md$/i.test(file)) {
      files.push(file);
    }
  }
  return files;
}

function getRecordDirectories(snapshot: RepoSnapshot): Set<string> {
  const dirs = new Set<string>();
  for (const file of snapshot.files.keys()) {
    if (!file.startsWith('records/')) {
      continue;
    }
    const parts = file.split('/');
    if (parts.length >= 2) {
      dirs.add(parts[1]);
    }
  }
  return dirs;
}

function parseMarkdownFromSnapshot(
  snapshot: RepoSnapshot,
  file: string
): { ok: true; yaml: Record<string, unknown>; body: string } | { ok: false; error: ValidationError } {
  const contents = snapshot.files.get(file);
  if (!contents) {
    return { ok: false, error: makeError('E_INTERNAL', `Missing file contents for ${file}`, file) };
  }
  return parseMarkdownRecord(decodeUtf8(contents), file);
}

export function validateDatasetSnapshot(snapshot: RepoSnapshot): ValidateDatasetResult {
  const errors: ValidationError[] = [];
  const pushError = (code: ValidationError['code'], message: string, file?: string) => {
    errors.push(makeError(code, message, file));
  };

  const files = [...snapshot.files.keys()];
  if (!files.some((file) => file.startsWith('datasets/'))) {
    pushError('E_DIR_MISSING', 'Missing required `datasets/` directory');
    return { ok: false, errors };
  }
  if (!files.some((file) => file.startsWith('types/'))) {
    pushError('E_DIR_MISSING', 'Missing required `types/` directory');
    return { ok: false, errors };
  }
  if (!files.some((file) => file.startsWith('records/'))) {
    pushError('E_DIR_MISSING', 'Missing required `records/` directory');
    return { ok: false, errors };
  }

  const datasetFiles = listDatasetFiles(snapshot);
  if (datasetFiles.length !== 1) {
    pushError(
      'E_DATASET_FILE_COUNT',
      `Expected exactly one Markdown file in datasets/, found ${datasetFiles.length}`
    );
    return { ok: false, errors };
  }

  const datasetRecordPath = datasetFiles[0];
  const datasetDoc = parseMarkdownFromSnapshot(snapshot, datasetRecordPath);
  if (!datasetDoc.ok) {
    errors.push(datasetDoc.error);
    return { ok: false, errors };
  }

  const datasetYaml = datasetDoc.yaml;
  const datasetId = getString(datasetYaml, 'id') ?? '';

  if (!datasetId || !datasetId.startsWith('dataset:')) {
    pushError('E_ID_PREFIX_INVALID', 'Dataset id must be a string beginning with "dataset:"', datasetRecordPath);
  }
  if (getString(datasetYaml, 'datasetId') !== datasetId) {
    pushError('E_DATASET_ID_MISMATCH', 'Dataset file datasetId must equal its id', datasetRecordPath);
  }
  if (getString(datasetYaml, 'typeId') !== 'sys:dataset') {
    pushError('E_TYPEID_MISMATCH', 'Dataset file typeId must be "sys:dataset"', datasetRecordPath);
  }
  if (!getString(datasetYaml, 'createdAt') || !getString(datasetYaml, 'updatedAt')) {
    pushError('E_REQUIRED_FIELD_MISSING', 'Dataset file must have createdAt and updatedAt', datasetRecordPath);
  }
  if (!isObject(datasetYaml.fields)) {
    pushError('E_REQUIRED_FIELD_MISSING', 'Dataset file fields must be an object', datasetRecordPath);
  } else {
    const name = getString(datasetYaml.fields, 'name');
    const description = getString(datasetYaml.fields, 'description');
    if (!name?.trim() || !description?.trim()) {
      pushError(
        'E_DATASET_FIELDS_MISSING',
        'Dataset fields must include `name` and `description`',
        datasetRecordPath
      );
    }
  }

  const typeFiles = listMarkdownFiles(snapshot, 'types/');
  const recordTypeIds = new Set<string>();
  const typeIds = new Set<string>();

  for (const file of typeFiles) {
    const doc = parseMarkdownFromSnapshot(snapshot, file);
    if (!doc.ok) {
      errors.push(doc.error);
      continue;
    }
    const yaml = doc.yaml;
    const typeId = getString(yaml, 'id');
    if (!typeId || !typeId.startsWith('type:')) {
      pushError('E_ID_PREFIX_INVALID', `Type file ${file} must have id beginning with "type:"`, file);
      continue;
    }
    if (typeIds.has(typeId)) {
      pushError('E_DUPLICATE_ID', `Duplicate type id ${typeId}`, file);
    }
    typeIds.add(typeId);
    if (getString(yaml, 'datasetId') !== datasetId) {
      pushError(
        'E_DATASET_ID_MISMATCH',
        `Type file ${file} has datasetId ${getString(yaml, 'datasetId')} but dataset id is ${datasetId}`,
        file
      );
    }
    if (getString(yaml, 'typeId') !== 'sys:type') {
      pushError('E_TYPEID_MISMATCH', `Type file ${file} typeId must be "sys:type"`, file);
    }
    if (!getString(yaml, 'createdAt') || !getString(yaml, 'updatedAt')) {
      pushError('E_REQUIRED_FIELD_MISSING', `Type file ${file} must have createdAt and updatedAt`, file);
    }
    if (!isObject(yaml.fields)) {
      pushError('E_REQUIRED_FIELD_MISSING', `Type file ${file} fields must be an object`, file);
      continue;
    }
    const recordTypeId = getString(yaml.fields, 'recordTypeId');
    if (!recordTypeId) {
      pushError('E_REQUIRED_FIELD_MISSING', `Type file ${file} fields must include recordTypeId`, file);
      continue;
    }
    if (!RECORD_TYPE_ID_PATTERN.test(recordTypeId)) {
      pushError(
        'E_RECORD_TYPE_ID_INVALID',
        'Type recordTypeId must be a stable identifier (no spaces or "/")',
        file
      );
      continue;
    }
    if (recordTypeIds.has(recordTypeId)) {
      pushError(
        'E_DUPLICATE_RECORD_TYPE_ID',
        `Duplicate recordTypeId detected: ${recordTypeId}`,
        file
      );
      continue;
    }
    recordTypeIds.add(recordTypeId);
  }

  const recordDirs = getRecordDirectories(snapshot);
  const recordFiles = listMarkdownFiles(snapshot, 'records/');

  for (const dirName of recordDirs) {
    if (!recordTypeIds.has(dirName)) {
      pushError(
        'E_UNKNOWN_RECORD_DIR',
        `Unknown record type directory ${dirName}/ (no type definition for recordTypeId ${dirName})`
      );
    }
  }

  for (const file of recordFiles) {
    const segments = file.split('/');
    const dirName = segments.length > 1 ? segments[1] : '';
    const doc = parseMarkdownFromSnapshot(snapshot, file);
    if (!doc.ok) {
      errors.push(doc.error);
      continue;
    }
    const yaml = doc.yaml;
    const recordId = getString(yaml, 'id');
    if (!recordId) {
      pushError('E_REQUIRED_FIELD_MISSING', `Record file ${file} missing id or id not a string`, file);
    }
    if (getString(yaml, 'datasetId') !== datasetId) {
      pushError(
        'E_DATASET_ID_MISMATCH',
        `Record file ${file} datasetId mismatch: expected ${datasetId}, found ${getString(yaml, 'datasetId')}`,
        file
      );
    }
    if (getString(yaml, 'typeId') !== dirName) {
      pushError(
        'E_TYPEID_MISMATCH',
        `Record file ${file} typeId ${getString(yaml, 'typeId')} does not match its containing directory name ${dirName}`,
        file
      );
    }
    if (!getString(yaml, 'createdAt') || !getString(yaml, 'updatedAt')) {
      pushError('E_REQUIRED_FIELD_MISSING', `Record file ${file} must have createdAt and updatedAt`, file);
    }
    if (!isObject(yaml.fields)) {
      pushError('E_REQUIRED_FIELD_MISSING', `Record file ${file} fields must be an object`, file);
    }
  }

  const seenIds = new Set<string>();
  const collectId = (id: string, file?: string) => {
    if (seenIds.has(id)) {
      pushError('E_DUPLICATE_ID', `Duplicate id detected: ${id}${file ? ` (in ${file})` : ''}`, file);
    }
    seenIds.add(id);
  };
  if (datasetId) {
    collectId(datasetId, datasetRecordPath);
  }
  for (const file of typeFiles) {
    const doc = parseMarkdownFromSnapshot(snapshot, file);
    if (doc.ok) {
      const id = getString(doc.yaml, 'id');
      if (id) {
        collectId(id, file);
      }
    }
  }
  for (const file of recordFiles) {
    const doc = parseMarkdownFromSnapshot(snapshot, file);
    if (doc.ok) {
      const id = getString(doc.yaml, 'id');
      if (id) {
        collectId(id, file);
      }
    }
  }

  if (errors.length) {
    return { ok: false, errors };
  }

  return { ok: true, datasetRecordPath, datasetId };
}
