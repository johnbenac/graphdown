import { makeError, type ValidationError } from './errors';
import { parseMarkdownRecord } from './graph';
import type { RepoSnapshot } from './snapshotTypes';
import { getString, isObject } from './types';
import { decodeUtf8 } from './encoding';

const DATASET_DIR = 'datasets/';
const TYPES_DIR = 'types/';
const RECORDS_DIR = 'records/';
const RECORD_TYPE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

export type ValidateDatasetResult =
  | { ok: true; datasetRecordPath: string; datasetId: string }
  | { ok: false; errors: ValidationError[] };

type ParsedRecord = {
  file: string;
  yaml: Record<string, unknown>;
  body: string;
};

function getMarkdownFiles(snapshot: RepoSnapshot, prefix: string): string[] {
  return [...snapshot.files.keys()]
    .filter((file) => file.startsWith(prefix) && file.toLowerCase().endsWith('.md'))
    .sort((a, b) => a.localeCompare(b));
}

function getDirectDatasetFiles(snapshot: RepoSnapshot): string[] {
  return getMarkdownFiles(snapshot, DATASET_DIR).filter(
    (file) => file.slice(DATASET_DIR.length).split('/').length === 1
  );
}

function parseRecord(snapshot: RepoSnapshot, file: string): ParsedRecord | ValidationError {
  const contents = snapshot.files.get(file);
  if (!contents) {
    return makeError('E_INTERNAL', `Missing file contents for ${file}`, file);
  }
  const parsed = parseMarkdownRecord(decodeUtf8(contents), file);
  if (!parsed.ok) {
    return parsed.error;
  }
  return { file, yaml: parsed.yaml, body: parsed.body };
}

function ensureRequiredFields(
  yaml: Record<string, unknown>,
  file: string,
  errors: ValidationError[]
) {
  const id = getString(yaml, 'id');
  const datasetId = getString(yaml, 'datasetId');
  const typeId = getString(yaml, 'typeId');
  const createdAt = getString(yaml, 'createdAt');
  const updatedAt = getString(yaml, 'updatedAt');
  const fields = yaml.fields;

  if (!id || !datasetId || !typeId || !createdAt || !updatedAt || !isObject(fields)) {
    errors.push(makeError('E_REQUIRED_FIELD_MISSING', 'Record is missing required fields', file));
  }
}

export function validateDatasetSnapshot(snapshot: RepoSnapshot): ValidateDatasetResult {
  const errors: ValidationError[] = [];
  const allFiles = [...snapshot.files.keys()];

  const hasDatasets = allFiles.some((file) => file.startsWith(DATASET_DIR));
  const hasTypes = allFiles.some((file) => file.startsWith(TYPES_DIR));
  const hasRecords = allFiles.some((file) => file.startsWith(RECORDS_DIR));

  if (!hasDatasets) {
    errors.push(makeError('E_DIR_MISSING', 'Missing required datasets/ directory'));
  }
  if (!hasTypes) {
    errors.push(makeError('E_DIR_MISSING', 'Missing required types/ directory'));
  }
  if (!hasRecords) {
    errors.push(makeError('E_DIR_MISSING', 'Missing required records/ directory'));
  }

  const datasetFiles = getDirectDatasetFiles(snapshot);
  if (datasetFiles.length !== 1) {
    errors.push(
      makeError(
        'E_DATASET_FILE_COUNT',
        `Expected exactly one dataset record file in datasets/, found ${datasetFiles.length}`
      )
    );
  }

  const datasetRecordPath = datasetFiles[0];
  let datasetId: string | undefined;
  let datasetRecord: ParsedRecord | undefined;

  if (datasetRecordPath) {
    const parsed = parseRecord(snapshot, datasetRecordPath);
    if ('code' in parsed) {
      errors.push(parsed);
    } else {
      datasetRecord = parsed;
      const yaml = parsed.yaml;
      const id = getString(yaml, 'id');
      const datasetIdField = getString(yaml, 'datasetId');
      const typeId = getString(yaml, 'typeId');
      const fields = yaml.fields;

      if (!id || !id.startsWith('dataset:')) {
        errors.push(
          makeError('E_ID_PREFIX_INVALID', 'Dataset id must start with "dataset:"', parsed.file)
        );
      }
      if (!datasetIdField || datasetIdField !== id) {
        errors.push(
          makeError('E_DATASET_ID_MISMATCH', 'datasetId must match dataset id', parsed.file)
        );
      }
      if (typeId !== 'sys:dataset') {
        errors.push(makeError('E_TYPEID_MISMATCH', 'Dataset typeId must be sys:dataset', parsed.file));
      }

      const fieldsObject = isObject(fields) ? fields : undefined;
      const name = fieldsObject ? getString(fieldsObject, 'name') : undefined;
      const description = fieldsObject ? getString(fieldsObject, 'description') : undefined;
      if (!name || !description) {
        errors.push(
          makeError(
            'E_DATASET_FIELDS_MISSING',
            'Dataset fields must include name and description',
            parsed.file
          )
        );
      }

      ensureRequiredFields(yaml, parsed.file, errors);
      datasetId = datasetIdField ?? id;
    }
  }

  const typeFiles = getMarkdownFiles(snapshot, TYPES_DIR);
  const recordTypeIds = new Set<string>();
  const seenIds = new Set<string>();

  if (datasetRecord?.yaml) {
    const datasetRecordId = getString(datasetRecord.yaml, 'id');
    if (datasetRecordId) {
      seenIds.add(datasetRecordId);
    }
  }

  for (const file of typeFiles) {
    const parsed = parseRecord(snapshot, file);
    if ('code' in parsed) {
      errors.push(parsed);
      continue;
    }
    const yaml = parsed.yaml;
    const id = getString(yaml, 'id');
    const datasetIdField = getString(yaml, 'datasetId');
    const typeId = getString(yaml, 'typeId');
    const fields = yaml.fields;

    ensureRequiredFields(yaml, parsed.file, errors);

    if (!id || !id.startsWith('type:')) {
      errors.push(makeError('E_ID_PREFIX_INVALID', 'Type id must start with "type:"', parsed.file));
    }
    if (datasetId && datasetIdField && datasetIdField !== datasetId) {
      errors.push(makeError('E_DATASET_ID_MISMATCH', 'datasetId must match dataset id', parsed.file));
    }
    if (typeId !== 'sys:type') {
      errors.push(makeError('E_TYPEID_MISMATCH', 'Type typeId must be sys:type', parsed.file));
    }

    const fieldsObject = isObject(fields) ? fields : undefined;
    const recordTypeId = fieldsObject ? getString(fieldsObject, 'recordTypeId') : undefined;
    if (!recordTypeId) {
      errors.push(makeError('E_REQUIRED_FIELD_MISSING', 'Type recordTypeId is required', parsed.file));
    } else if (!RECORD_TYPE_ID_PATTERN.test(recordTypeId)) {
      errors.push(
        makeError(
          'E_RECORD_TYPE_ID_INVALID',
          'Type recordTypeId must be a stable identifier (no spaces or "/")',
          parsed.file
        )
      );
    } else if (recordTypeIds.has(recordTypeId)) {
      errors.push(
        makeError(
          'E_DUPLICATE_RECORD_TYPE_ID',
          `Duplicate recordTypeId detected: ${recordTypeId}`,
          parsed.file
        )
      );
    } else {
      recordTypeIds.add(recordTypeId);
    }

    if (id) {
      if (seenIds.has(id)) {
        errors.push(makeError('E_DUPLICATE_ID', `Duplicate id detected: ${id}`, parsed.file));
      } else {
        seenIds.add(id);
      }
    }
  }

  const recordFiles = getMarkdownFiles(snapshot, RECORDS_DIR);
  const recordDirs = new Set<string>();

  for (const file of recordFiles) {
    const relative = file.slice(RECORDS_DIR.length);
    const [recordDir] = relative.split('/');
    if (recordDir) {
      recordDirs.add(recordDir);
    }
  }

  for (const recordDir of recordDirs) {
    if (!recordTypeIds.has(recordDir)) {
      errors.push(
        makeError('E_UNKNOWN_RECORD_DIR', `Unknown record directory: records/${recordDir}/`)
      );
    }
  }

  for (const file of recordFiles) {
    const parsed = parseRecord(snapshot, file);
    if ('code' in parsed) {
      errors.push(parsed);
      continue;
    }
    const yaml = parsed.yaml;
    const id = getString(yaml, 'id');
    const datasetIdField = getString(yaml, 'datasetId');
    const typeId = getString(yaml, 'typeId');
    const relative = file.slice(RECORDS_DIR.length);
    const [recordDir] = relative.split('/');

    ensureRequiredFields(yaml, parsed.file, errors);

    if (datasetId && datasetIdField && datasetIdField !== datasetId) {
      errors.push(makeError('E_DATASET_ID_MISMATCH', 'datasetId must match dataset id', parsed.file));
    }
    if (recordDir && typeId && typeId !== recordDir) {
      errors.push(
        makeError('E_TYPEID_MISMATCH', 'Record typeId must match record directory', parsed.file)
      );
    }

    if (id) {
      if (seenIds.has(id)) {
        errors.push(makeError('E_DUPLICATE_ID', `Duplicate id detected: ${id}`, parsed.file));
      } else {
        seenIds.add(id);
      }
    } else {
      errors.push(makeError('E_REQUIRED_FIELD_MISSING', 'Record id is required', parsed.file));
    }
  }

  if (errors.length) {
    return { ok: false, errors };
  }
  if (!datasetId || !datasetRecordPath) {
    return { ok: false, errors: [makeError('E_INTERNAL', 'Dataset record missing')] };
  }

  return { ok: true, datasetRecordPath, datasetId };
}
