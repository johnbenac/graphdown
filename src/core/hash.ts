import { createHash } from 'node:crypto';

import { makeError, type ValidationError } from './errors';
import { parseMarkdownRecord } from './graph';
import type { RepoSnapshot } from './snapshotTypes';

export type HashScope = 'schema' | 'snapshot';

type HashResult = { ok: true; digest: string } | { ok: false; errors: ValidationError[] };

const decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8', { fatal: true }) : null;
const encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;

function decodeUtf8Fatal(raw: Uint8Array, file: string, errors: ValidationError[]): string | null {
  try {
    if (!decoder) {
      errors.push(makeError('E_INTERNAL', 'TextDecoder not available for UTF-8 decode', file));
      return null;
    }
    return decoder.decode(raw);
  } catch {
    errors.push(makeError('E_UTF8_INVALID', 'Invalid UTF-8 encoding', file));
    return null;
  }
}

function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n?/g, '\n');
}

function isRecordPath(path: string, scope: HashScope): boolean {
  const lower = path.toLowerCase();
  if (!lower.endsWith('.md')) {
    return false;
  }
  if (scope === 'schema') {
    return path.startsWith('types/');
  }
  return path.startsWith('types/') || path.startsWith('records/');
}

function lexCompareBytes(a: Uint8Array, b: Uint8Array): number {
  const length = Math.min(a.length, b.length);
  for (let i = 0; i < length; i++) {
    if (a[i] !== b[i]) {
      return a[i] < b[i] ? -1 : 1;
    }
  }
  if (a.length === b.length) return 0;
  return a.length < b.length ? -1 : 1;
}

export function computeGdHashV1(snapshot: RepoSnapshot, scope: HashScope): HashResult {
  if (scope !== 'schema' && scope !== 'snapshot') {
    return { ok: false, errors: [makeError('E_USAGE', `Unknown hash scope: ${String(scope)}`)] };
  }

  const recordEntries: Array<{ id: string; idBytes: Uint8Array; file: string; bytes: Uint8Array }> = [];
  const errors: ValidationError[] = [];
  const seenIds = new Set<string>();

  const files = [...snapshot.files.keys()].filter((file) => isRecordPath(file, scope));

  for (const file of files) {
    const raw = snapshot.files.get(file);
    if (!raw) {
      continue;
    }
    const decoded = decodeUtf8Fatal(raw, file, errors);
    if (decoded === null) {
      continue;
    }
    const normalized = normalizeLineEndings(decoded);
    const parsed = parseMarkdownRecord(normalized, file);
    if (!parsed.ok) {
      errors.push(parsed.error);
      continue;
    }
    const idRaw = parsed.yaml.id;
    const id = typeof idRaw === 'string' ? idRaw.trim() : '';
    if (!id) {
      errors.push(
        makeError('E_REQUIRED_FIELD_MISSING', `Record file ${file} is missing required id for hashing`, file)
      );
      continue;
    }
    if (seenIds.has(id)) {
      errors.push(makeError('E_DUPLICATE_ID', `Duplicate id detected during hashing: ${id}`, file));
      continue;
    }
    seenIds.add(id);
    if (!encoder) {
      errors.push(makeError('E_INTERNAL', 'TextEncoder not available for hashing', file));
      continue;
    }
    const contentBytes = encoder.encode(normalized);
    const idBytes = encoder.encode(id);
    recordEntries.push({ id, idBytes, file, bytes: contentBytes });
  }

  if (errors.length) {
    return { ok: false, errors };
  }

  recordEntries.sort((a, b) => lexCompareBytes(a.idBytes, b.idBytes));

  const hash = createHash('sha256');
  hash.update(Buffer.from('graphdown:gdhash:v1\0', 'utf8'));

  for (const entry of recordEntries) {
    hash.update(entry.idBytes);
    hash.update(Uint8Array.of(0));
    hash.update(Buffer.from(String(entry.bytes.length), 'utf8'));
    hash.update(Uint8Array.of(0));
    hash.update(entry.bytes);
    hash.update(Uint8Array.of(0));
  }

  const digest = hash.digest('hex');
  return { ok: true, digest };
}
