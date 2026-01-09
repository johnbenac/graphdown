import { isRecordFileBytes, parseGraphdownText } from '../parse/datasetObjects';
import { makeError, type ValidationError } from '../validate/errors';
import type { DatasetSnapshot } from '../model/snapshotTypes';
import { cidFromRawBytes } from '../cid/daslCid';

export type HashScope = 'schema' | 'snapshot';

type HashResult = { ok: true; cid: string } | { ok: false; errors: ValidationError[] };

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

export function computeGdHashV1(snapshot: DatasetSnapshot, scope: HashScope): HashResult {
  if (scope !== 'schema' && scope !== 'snapshot') {
    return { ok: false, errors: [makeError('E_USAGE', `Unknown hash scope: ${String(scope)}`)] };
  }
  if (!encoder) {
    return { ok: false, errors: [makeError('E_INTERNAL', 'TextEncoder not available for hashing')] };
  }

  const recordEntries: Array<{ id: string; idBytes: Uint8Array; file: string; bytes: Uint8Array }> = [];
  const errors: ValidationError[] = [];
  const seenIds = new Set<string>();

  const files = [...snapshot.files.keys()].sort((a, b) => a.localeCompare(b));

  for (const file of files) {
    const raw = snapshot.files.get(file);
    if (!raw) continue;
    if (!isRecordFileBytes(file, raw)) continue;

    const decoded = decodeUtf8Fatal(raw, file, errors);
    if (decoded === null) continue;

    const normalizedText = normalizeLineEndings(decoded);
    const parsed = parseGraphdownText(file, normalizedText);
    if (parsed.kind === 'ignored') continue;
    if (parsed.kind === 'error') {
      errors.push(parsed.error);
      continue;
    }

    const include =
      (scope === 'schema' && parsed.kind === 'type') ||
      (scope === 'snapshot' && (parsed.kind === 'type' || parsed.kind === 'record'));
    if (!include) continue;

    if (seenIds.has(parsed.identity)) {
      errors.push(makeError('E_DUPLICATE_ID', `Duplicate identity detected during hashing: ${parsed.identity}`, file));
      continue;
    }
    seenIds.add(parsed.identity);

    const contentBytes = encoder.encode(normalizedText);
    const idBytes = encoder.encode(parsed.identity);
    recordEntries.push({ id: parsed.identity, idBytes, file, bytes: contentBytes });
  }

  if (errors.length) {
    return { ok: false, errors };
  }

  recordEntries.sort((a, b) => lexCompareBytes(a.idBytes, b.idBytes));

  const segments: Uint8Array[] = [];
  segments.push(encoder.encode('graphdown:gdhash:v1\0'));

  for (const entry of recordEntries) {
    segments.push(entry.idBytes);
    segments.push(Uint8Array.of(0));
    segments.push(encoder.encode(String(entry.bytes.length)));
    segments.push(Uint8Array.of(0));
    segments.push(entry.bytes);
    segments.push(Uint8Array.of(0));
  }

  const totalLength = segments.reduce((sum, segment) => sum + segment.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const segment of segments) {
    combined.set(segment, offset);
    offset += segment.length;
  }
  const cid = cidFromRawBytes(combined);
  return { ok: true, cid };
}
