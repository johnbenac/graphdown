import { createHash } from 'node:crypto';

import { makeError, type ValidationError } from './errors';
import { parseMarkdownRecord } from './graph';
import type { RepoSnapshot } from './snapshotTypes';

export type HashScope = 'schema' | 'snapshot';

type HashResult = { ok: true; digest: string } | { ok: false; errors: ValidationError[] };

const decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8', { fatal: true }) : null;

function decodeUtf8Fatal(raw: Uint8Array, file: string, errors: ValidationError[]): string | null {
  try {
    if (!decoder) {
      errors.push(makeError('E_INTERNAL', 'TextDecoder not available for UTF-8 decode', file));
      return null;
    }
    return decoder.decode(raw);
  } catch {
    errors.push(makeError('E_INTERNAL', 'Invalid UTF-8 encoding', file));
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

export function computeGdHashV1(snapshot: RepoSnapshot, scope: HashScope): HashResult {
  const recordEntries: Array<{ id: string; file: string; bytes: Uint8Array }> = [];
  const errors: ValidationError[] = [];

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
    const contentBytes = new TextEncoder().encode(normalized);
    recordEntries.push({ id, file, bytes: contentBytes });
  }

  if (errors.length) {
    return { ok: false, errors };
  }

  recordEntries.sort((a, b) => a.id.localeCompare(b.id) || a.file.localeCompare(b.file));

  const parts: Buffer[] = [Buffer.from('graphdown:gdhash:v1\0', 'utf8')];

  for (const entry of recordEntries) {
    parts.push(Buffer.from(entry.id, 'utf8'));
    parts.push(Buffer.from([0]));
    parts.push(Buffer.from(String(entry.bytes.length), 'utf8'));
    parts.push(Buffer.from([0]));
    parts.push(Buffer.from(entry.bytes));
    parts.push(Buffer.from([0]));
  }

  const digest = createHash('sha256').update(Buffer.concat(parts)).digest('hex');
  return { ok: true, digest };
}
