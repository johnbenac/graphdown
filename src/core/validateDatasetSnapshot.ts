import { makeError, type ValidationError } from './errors';
import { parseMarkdownRecord } from './graph';
import { getString, isObject } from './types';
import type { RepoSnapshot } from './snapshotTypes';

export type ValidateDatasetResult =
  | { ok: true; datasetRecordPath: string; datasetId: string }
  | { ok: false; errors: ValidationError[] };

const RECORD_TYPE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
const decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8') : null;

function decodeBytes(bytes: Uint8Array): string {
  if (decoder) {
    return decoder.decode(bytes);
  }
  return Buffer.from(bytes).toString('utf8');
}

function isMissingDir(files: string[], dir: string) {
  return !files.some((file) => file.startsWith(`${dir}/`));
}

function listDatasetFiles(files: string[]) {
  return files.filter((file) => /^datasets\/[^/]+\.md$/i.test(file));
}

function listMarkdownFiles(files: string[], prefix: string) {
  return files.filter((file) => file.startsWith(prefix) && file.toLowerCase().endsWith('.md'));
}

export function validateDatasetSnapshot(snapshot: RepoSnapshot): ValidateDatasetResult {
  const errors: ValidationError[] = [];
  const files = [...snapshot.files.keys()];

  if (isMissingDir(files, 'datasets')) {
    errors.push(makeError('E_DIR_MISSING', 'Missing required `datasets/` directory'));
  }
  if (isMissingDir(files, 'types')) {
    errors.push(makeError('E_DIR_MISSING', 'Missing required `types/` directory'));
  }
  if (isMissingDir(files, 'records')) {
    errors.push(makeError('E_DIR_MISSING', 'Missing required `records/` directory'));
  }

  if (errors.length) {
    return { ok: false, errors };
  }

  const datasetFiles = listDatasetFiles(files);
  if (datasetFiles.length !== 1) {
    errors.push(
      makeError(
        'E_DATASET_FILE_COUNT',
        `Expected exactly one Markdown file in datasets/, found ${datasetFiles.length}`
      )
    );
    return { ok: false, errors };
  }

  const datasetPath = datasetFiles[0];
  const datasetRaw = snapshot.files.get(datasetPath);
  if (!datasetRaw) {
    errors.push(makeError('E_YAML_INVALID', 'Dataset file could not be read', datasetPath));
    return { ok: false, errors };
  }

  const datasetText = decodeBytes(datasetRaw);
  const datasetParsed = parseMarkdownRecord(datasetText, datasetPath);
  if (!datasetParsed.ok) {
    errors.push(datasetParsed.error);
    return { ok: false, errors };
  }

  const datasetYaml = datasetParsed.yaml;
  const datasetId = getString(datasetYaml, 'id') ?? '';

  if (!datasetId || !datasetId.startsWith('dataset:')) {
    errors.push(
      makeError('E_ID_PREFIX_INVALID', 'Dataset id must be a string beginning with "dataset:"', datasetPath)
    );
  }

  const datasetIdField = getString(datasetYaml, 'datasetId');
  if (!datasetIdField) {
    errors.push(makeError('E_REQUIRED_FIELD_MISSING', 'Dataset file must include datasetId', datasetPath));
  } else if (datasetIdField !== datasetId) {
    errors.push(
      makeError('E_DATASET_ID_MISMATCH', 'Dataset file datasetId must equal its id', datasetPath)
    );
  }

  const datasetTypeId = getString(datasetYaml, 'typeId');
  if (!datasetTypeId) {
    errors.push(makeError('E_REQUIRED_FIELD_MISSING', 'Dataset file must include typeId', datasetPath));
  } else if (datasetTypeId !== 'sys:dataset') {
    errors.push(makeError('E_TYPEID_MISMATCH', 'Dataset file typeId must be "sys:dataset"', datasetPath));
  }

  if (!getString(datasetYaml, 'createdAt') || !getString(datasetYaml, 'updatedAt')) {
    errors.push(makeError('E_REQUIRED_FIELD_MISSING', 'Dataset file must have createdAt and updatedAt', datasetPath));
  }

  if (!isObject(datasetYaml.fields)) {
    errors.push(makeError('E_REQUIRED_FIELD_MISSING', 'Dataset file fields must be an object', datasetPath));
  } else {
    const name = getString(datasetYaml.fields, 'name');
    const description = getString(datasetYaml.fields, 'description');
    if (!name || !description) {
      errors.push(
        makeError('E_DATASET_FIELDS_MISSING', 'Dataset fields must include `name` and `description`', datasetPath)
      );
    }
  }

  const typeFiles = listMarkdownFiles(files, 'types/');
  const recordFiles = listMarkdownFiles(files, 'records/');

  const recordTypeIds = new Set<string>();
  const typeIds = new Set<string>();

  for (const file of typeFiles) {
    const raw = snapshot.files.get(file);
    if (!raw) {
      errors.push(makeError('E_YAML_INVALID', 'Type file could not be read', file));
      continue;
    }
    const text = decodeBytes(raw);
    const parsed = parseMarkdownRecord(text, file);
    if (!parsed.ok) {
      errors.push(parsed.error);
      continue;
    }

    const yaml = parsed.yaml;
    const id = getString(yaml, 'id');
    if (!id || !id.startsWith('type:')) {
      errors.push(makeError('E_ID_PREFIX_INVALID', 'Type id must be a string beginning with "type:"', file));
      continue;
    }
    if (typeIds.has(id)) {
      errors.push(makeError('E_DUPLICATE_ID', `Duplicate type id ${id}`, file));
    }
    typeIds.add(id);

    const typeDatasetId = getString(yaml, 'datasetId');
    if (!typeDatasetId) {
      errors.push(makeError('E_REQUIRED_FIELD_MISSING', 'Type file must include datasetId', file));
    } else if (datasetId && typeDatasetId !== datasetId) {
      errors.push(
        makeError(
          'E_DATASET_ID_MISMATCH',
          `Type file datasetId ${typeDatasetId} does not match dataset id ${datasetId}`,
          file
        )
      );
    }

    const typeTypeId = getString(yaml, 'typeId');
    if (!typeTypeId) {
      errors.push(makeError('E_REQUIRED_FIELD_MISSING', 'Type file must include typeId', file));
    } else if (typeTypeId !== 'sys:type') {
      errors.push(makeError('E_TYPEID_MISMATCH', 'Type file typeId must be "sys:type"', file));
    }

    if (!getString(yaml, 'createdAt') || !getString(yaml, 'updatedAt')) {
      errors.push(makeError('E_REQUIRED_FIELD_MISSING', 'Type file must have createdAt and updatedAt', file));
    }

    if (!isObject(yaml.fields)) {
      errors.push(makeError('E_REQUIRED_FIELD_MISSING', 'Type file fields must be an object', file));
      continue;
    }

    const recordTypeId = getString(yaml.fields, 'recordTypeId');
    if (!recordTypeId) {
      errors.push(makeError('E_REQUIRED_FIELD_MISSING', 'Type file fields must include recordTypeId', file));
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
    if (recordTypeIds.has(recordTypeId)) {
      errors.push(makeError('E_DUPLICATE_RECORD_TYPE_ID', `Duplicate recordTypeId ${recordTypeId}`, file));
      continue;
    }
    recordTypeIds.add(recordTypeId);
  }

  const recordDirs = new Set<string>();
  for (const file of recordFiles) {
    const match = file.match(/^records\/([^/]+)\//);
    if (match) {
      recordDirs.add(match[1]);
    }
  }

  for (const dir of recordDirs) {
    if (!recordTypeIds.has(dir)) {
      errors.push(
        makeError(
          'E_UNKNOWN_RECORD_DIR',
          `Unknown record type directory ${dir}/ (no type definition for recordTypeId ${dir})`
        )
      );
    }
  }

  for (const file of recordFiles) {
    const raw = snapshot.files.get(file);
    if (!raw) {
      errors.push(makeError('E_YAML_INVALID', 'Record file could not be read', file));
      continue;
    }
    const text = decodeBytes(raw);
    const parsed = parseMarkdownRecord(text, file);
    if (!parsed.ok) {
      errors.push(parsed.error);
      continue;
    }

    const yaml = parsed.yaml;
    const id = getString(yaml, 'id');
    if (!id) {
      errors.push(makeError('E_REQUIRED_FIELD_MISSING', 'Record file missing id', file));
    }

    const recordDatasetId = getString(yaml, 'datasetId');
    if (!recordDatasetId) {
      errors.push(makeError('E_REQUIRED_FIELD_MISSING', 'Record file must include datasetId', file));
    } else if (datasetId && recordDatasetId !== datasetId) {
      errors.push(
        makeError(
          'E_DATASET_ID_MISMATCH',
          `Record file datasetId ${recordDatasetId} does not match dataset id ${datasetId}`,
          file
        )
      );
    }

    const recordTypeId = getString(yaml, 'typeId');
    const dirMatch = file.match(/^records\/([^/]+)\//);
    const expectedTypeId = dirMatch ? dirMatch[1] : '';
    if (!recordTypeId) {
      errors.push(makeError('E_REQUIRED_FIELD_MISSING', 'Record file must include typeId', file));
    } else if (expectedTypeId && recordTypeId !== expectedTypeId) {
      errors.push(
        makeError(
          'E_TYPEID_MISMATCH',
          `Record file typeId ${recordTypeId} does not match directory ${expectedTypeId}`,
          file
        )
      );
    }

    if (!getString(yaml, 'createdAt') || !getString(yaml, 'updatedAt')) {
      errors.push(makeError('E_REQUIRED_FIELD_MISSING', 'Record file must have createdAt and updatedAt', file));
    }

    if (!isObject(yaml.fields)) {
      errors.push(makeError('E_REQUIRED_FIELD_MISSING', 'Record file fields must be an object', file));
    }
  }

  const seenIds = new Set<string>();
  const recordIds: Array<{ id: string; file: string }> = [];

  if (datasetId) {
    recordIds.push({ id: datasetId, file: datasetPath });
  }

  for (const file of typeFiles) {
    const raw = snapshot.files.get(file);
    if (!raw) {
      continue;
    }
    const text = decodeBytes(raw);
    const parsed = parseMarkdownRecord(text, file);
    if (parsed.ok) {
      const id = getString(parsed.yaml, 'id');
      if (id) {
        recordIds.push({ id, file });
      }
    }
  }

  for (const file of recordFiles) {
    const raw = snapshot.files.get(file);
    if (!raw) {
      continue;
    }
    const text = decodeBytes(raw);
    const parsed = parseMarkdownRecord(text, file);
    if (parsed.ok) {
      const id = getString(parsed.yaml, 'id');
      if (id) {
        recordIds.push({ id, file });
      }
    }
  }

  for (const { id, file } of recordIds) {
    if (seenIds.has(id)) {
      errors.push(makeError('E_DUPLICATE_ID', `Duplicate id detected: ${id} (in ${file})`, file));
    }
    seenIds.add(id);
  }

  if (errors.length) {
    return { ok: false, errors };
  }

  return { ok: true, datasetRecordPath: datasetPath, datasetId };
}
