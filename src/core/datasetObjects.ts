import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';

import { extractFrontMatter } from './frontMatter';
import { makeError, type ValidationError } from './errors';
import { isObject } from './types';
import { parseYamlObject } from './yaml';

export const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

export type ParsedTypeObject = {
  kind: 'type';
  file: string;
  typeId: string;
  fields: Record<string, unknown>;
  body: string;
  identity: string;
};

export type ParsedRecordObject = {
  kind: 'record';
  file: string;
  typeId: string;
  recordId: string;
  fields: Record<string, unknown>;
  body: string;
  identity: string;
};

export type ParsedGraphdownObject =
  | ParsedTypeObject
  | ParsedRecordObject
  | { kind: 'ignored' }
  | { kind: 'error'; error: ValidationError };

const textDecoder =
  typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8', { fatal: true }) : null;

export function isRecordFileBytes(path: string, bytes: Uint8Array): boolean {
  const lower = path.toLowerCase();
  if (!lower.endsWith('.md')) {
    return false;
  }
  if (bytes.length < 4) {
    return false;
  }
  if (bytes[0] !== 45 || bytes[1] !== 45 || bytes[2] !== 45) {
    return false;
  }
  const next = bytes[3];
  if (next === 10) return true; // \n
  if (next === 13 && bytes.length >= 5 && bytes[4] === 10) return true; // \r\n
  if (next === 13) return true; // bare \r
  return false;
}

function decodeUtf8(bytes: Uint8Array, file: string): { ok: true; text: string } | { ok: false; error: ValidationError } {
  if (!textDecoder) {
    return { ok: false, error: makeError('E_INTERNAL', 'TextDecoder not available', file) };
  }
  try {
    return { ok: true, text: textDecoder.decode(bytes) };
  } catch {
    return { ok: false, error: makeError('E_UTF8_INVALID', 'Invalid UTF-8 encoding', file) };
  }
}

function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n?/g, '\n');
}

function validateIdentifier(value: unknown, key: 'typeId' | 'recordId', file: string): { ok: true; value: string } | { ok: false; error: ValidationError } {
  if (typeof value !== 'string') {
    return {
      ok: false,
      error: makeError('E_INVALID_IDENTIFIER', `${key} must be a string`, file),
    };
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return {
      ok: false,
      error: makeError('E_INVALID_IDENTIFIER', `${key} must be non-empty after trimming`, file),
    };
  }
  if (!IDENTIFIER_PATTERN.test(trimmed)) {
    return {
      ok: false,
      error: makeError(
        'E_INVALID_IDENTIFIER',
        `${key} must match ${IDENTIFIER_PATTERN.source} and MUST NOT contain ":"`,
        file,
      ),
    };
  }
  if (trimmed.includes(':')) {
    return {
      ok: false,
      error: makeError('E_INVALID_IDENTIFIER', `${key} must not contain ":"`, file),
    };
  }
  if (key === 'typeId' && trimmed === 'gdblob') {
    return {
      ok: false,
      error: makeError('E_INVALID_IDENTIFIER', 'typeId "gdblob" is reserved', file),
    };
  }
  return { ok: true, value: trimmed };
}

export function parseGraphdownText(path: string, text: string): ParsedGraphdownObject {
  try {
    const normalized = normalizeLineEndings(text);
    let yamlSection: string;
    let body: string;
    try {
      ({ yaml: yamlSection, body } = extractFrontMatter(normalized));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const code = message.includes('Missing closing YAML front matter delimiter')
        ? 'E_FRONT_MATTER_UNTERMINATED'
        : 'E_FRONT_MATTER_MISSING';
      return { kind: 'error', error: makeError(code, message, path) };
    }

    let yamlObject: Record<string, unknown>;
    try {
      yamlObject = parseYamlObject(yamlSection);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const code = message === 'YAML front matter is not a valid object' ? 'E_YAML_NOT_OBJECT' : 'E_YAML_INVALID';
      return { kind: 'error', error: makeError(code, message, path) };
    }

    const typeIdCheck = validateIdentifier(yamlObject.typeId, 'typeId', path);
    if (!typeIdCheck.ok) {
      // If no typeId, this file is ignored (LAYOUT-001); but a non-string typeId is an error.
      if (yamlObject.typeId === undefined) {
        return { kind: 'ignored' };
      }
      return { kind: 'error', error: typeIdCheck.error };
    }
    const typeId = typeIdCheck.value;

    const topLevelKeys = Object.keys(yamlObject);
    const hasRecordId = Object.prototype.hasOwnProperty.call(yamlObject, 'recordId');

    if (hasRecordId) {
      const allowed = new Set(['typeId', 'recordId', 'fields']);
      for (const key of topLevelKeys) {
        if (!allowed.has(key)) {
          return {
            kind: 'error',
            error: makeError('E_FORBIDDEN_TOP_LEVEL_KEY', `Top-level key "${key}" is not allowed in record objects`, path),
          };
        }
      }
    } else {
      const allowed = new Set(['typeId', 'fields']);
      for (const key of topLevelKeys) {
        if (!allowed.has(key)) {
          return {
            kind: 'error',
            error: makeError('E_FORBIDDEN_TOP_LEVEL_KEY', `Top-level key "${key}" is not allowed in type objects`, path),
          };
        }
      }
    }

    const fields = yamlObject.fields;
    if (!isObject(fields)) {
      return {
        kind: 'error',
        error: makeError('E_REQUIRED_FIELD_MISSING', 'fields must be an object', path),
      };
    }

    if (hasRecordId) {
      const recordIdCheck = validateIdentifier(yamlObject.recordId, 'recordId', path);
      if (!recordIdCheck.ok) {
        return { kind: 'error', error: recordIdCheck.error };
      }
      const recordId = recordIdCheck.value;
      return {
        kind: 'record',
        file: path,
        typeId,
        recordId,
        fields,
        body,
        identity: `${typeId}:${recordId}`,
      };
    }

    return {
      kind: 'type',
      file: path,
      typeId,
      fields,
      body,
      identity: typeId,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { kind: 'error', error: makeError('E_INTERNAL', message, path) };
  }
}

export function parseGraphdownFile(path: string, bytes: Uint8Array): ParsedGraphdownObject {
  if (!isRecordFileBytes(path, bytes)) {
    return { kind: 'ignored' };
  }
  const decoded = decodeUtf8(bytes, path);
  if (!decoded.ok) {
    return { kind: 'error', error: decoded.error };
  }
  return parseGraphdownText(path, decoded.text);
}

export function discoverGraphdownObjects(snapshot: { files: Map<string, Uint8Array> }): {
  typeObjects: ParsedTypeObject[];
  recordObjects: ParsedRecordObject[];
  ignored: string[];
  errors: ValidationError[];
} {
  const typeObjects: ParsedTypeObject[] = [];
  const recordObjects: ParsedRecordObject[] = [];
  const ignored: string[] = [];
  const errors: ValidationError[] = [];

  const files = [...snapshot.files.keys()].sort((a, b) => a.localeCompare(b));
  for (const file of files) {
    const bytes = snapshot.files.get(file);
    if (!bytes) continue;
    const parsed = parseGraphdownFile(file, bytes);
    if (parsed.kind === 'ignored') {
      ignored.push(file);
      continue;
    }
    if (parsed.kind === 'error') {
      errors.push(parsed.error);
      continue;
    }
    if (parsed.kind === 'type') {
      typeObjects.push(parsed);
    } else if (parsed.kind === 'record') {
      recordObjects.push(parsed);
    }
  }

  return { typeObjects, recordObjects, ignored, errors };
}

export function computeBlobDigest(bytes: Uint8Array): string {
  return bytesToHex(sha256(bytes));
}
