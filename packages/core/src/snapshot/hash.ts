import { sha256 } from '@noble/hashes/sha256';

import { encodeBase32 } from '../cid/base32';
import { isValidPluginId } from '../model/ids';
import { isRecordFileBytes, parseGraphdownText } from '../parse/datasetObjects';
import { parsePluginManifest } from '../parse/pluginManifest';
import { makeError, type ValidationError } from '../validate/errors';
import type { DatasetSnapshot } from '../model/snapshotTypes';

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

  const entries: Array<{ id: string; idBytes: Uint8Array; file: string; bytes: Uint8Array }> = [];
  const errors: ValidationError[] = [];
  const seenIds = new Set<string>();
  const pluginManifests: Array<{ pluginId: string; manifestPath: string; declaredFiles: string[] }> = [];

  const files = [...snapshot.files.keys()].sort((a, b) => a.localeCompare(b));

  for (const file of files) {
    const raw = snapshot.files.get(file);
    if (!raw) continue;
    if (!isRecordFileBytes(file, raw)) continue;

    const decoded = decodeUtf8Fatal(raw, file, errors);
    if (decoded === null) continue;

    const normalizedText = normalizeLineEndings(decoded);
    const parsed = parseGraphdownText(file, normalizedText);
    if (parsed.kind === 'error') {
      errors.push(parsed.error);
      continue;
    }
    if (parsed.kind === 'ignored') {
      if (scope === 'snapshot') {
        const parsedManifest = parsePluginManifest(normalizedText, file);
        if (!parsedManifest.ok) {
          errors.push(parsedManifest.error);
          continue;
        }
        const yaml = parsedManifest.manifest.yaml;
        const hasPluginId = Object.prototype.hasOwnProperty.call(yaml, 'pluginId');
        const hasApiVersion = Object.prototype.hasOwnProperty.call(yaml, 'gdApiVersion');
        const hasTypeId = Object.prototype.hasOwnProperty.call(yaml, 'typeId');
        if (hasPluginId && hasApiVersion && !hasTypeId) {
          const pluginId = yaml.pluginId;
          if (!isValidPluginId(pluginId)) {
            errors.push(
              makeError('E_PLUGIN_KEYS_INVALID', `Plugin manifest ${file} pluginId must satisfy PLUG-ID-001`, file),
            );
            continue;
          }
          const files = yaml.files;
          if (!Array.isArray(files) || files.some((item) => typeof item !== 'string')) {
            errors.push(
              makeError('E_PLUGIN_KEYS_INVALID', `Plugin manifest ${file} files must be a list of strings`, file),
            );
            continue;
          }
          const identity = `plugin.${pluginId}`;
          if (seenIds.has(identity)) {
            errors.push(makeError('E_DUPLICATE_ID', `Duplicate identity detected during hashing: ${identity}`, file));
            continue;
          }
          seenIds.add(identity);
          const contentBytes = encoder.encode(normalizedText);
          const idBytes = encoder.encode(identity);
          entries.push({ id: identity, idBytes, file, bytes: contentBytes });
          pluginManifests.push({ pluginId, manifestPath: file, declaredFiles: files });
        }
      }
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
    entries.push({ id: parsed.identity, idBytes, file, bytes: contentBytes });
  }

  if (scope === 'snapshot') {
    for (const manifest of pluginManifests) {
      const lastSlash = manifest.manifestPath.lastIndexOf('/');
      const manifestDir = lastSlash === -1 ? '' : manifest.manifestPath.slice(0, lastSlash);
      for (const relativePath of manifest.declaredFiles) {
        const identity = `plugin.${manifest.pluginId}/${relativePath}`;
        if (seenIds.has(identity)) {
          errors.push(makeError('E_DUPLICATE_ID', `Duplicate identity detected during hashing: ${identity}`, manifest.manifestPath));
          continue;
        }
        seenIds.add(identity);
        const resolvedPath = manifestDir ? `${manifestDir}/${relativePath}` : relativePath;
        const rawBundle = snapshot.files.get(resolvedPath);
        if (!rawBundle) {
          errors.push(
            makeError('E_PLUGIN_FILE_MISSING', `Plugin bundle file missing: ${resolvedPath}`, manifest.manifestPath),
          );
          continue;
        }
        if (resolvedPath.startsWith('blocks/')) {
          errors.push(
            makeError('E_PLUGIN_FILE_KIND_FORBIDDEN', 'Plugin bundle file must not be a block store file', resolvedPath),
          );
          continue;
        }
        const decodedBundle = decodeUtf8Fatal(rawBundle, resolvedPath, errors);
        if (decodedBundle === null) continue;
        const normalizedBundle = normalizeLineEndings(decodedBundle);
        const contentBytes = encoder.encode(normalizedBundle);
        const idBytes = encoder.encode(identity);
        entries.push({ id: identity, idBytes, file: resolvedPath, bytes: contentBytes });
      }
    }
  }

  if (errors.length) {
    return { ok: false, errors };
  }

  entries.sort((a, b) => lexCompareBytes(a.idBytes, b.idBytes));

  const hash = sha256.create();
  hash.update(encoder.encode('graphdown:gdhash:v1\0'));

  for (const entry of entries) {
    hash.update(entry.idBytes);
    hash.update(Uint8Array.of(0));
    hash.update(encoder.encode(String(entry.bytes.length)));
    hash.update(Uint8Array.of(0));
    hash.update(entry.bytes);
    hash.update(Uint8Array.of(0));
  }

  const digestBytes = hash.digest();
  const cidBytes = Uint8Array.of(0x01, 0x55, 0x12, 0x20, ...digestBytes);
  const cid = `b${encodeBase32(cidBytes)}`;
  return { ok: true, cid };
}
