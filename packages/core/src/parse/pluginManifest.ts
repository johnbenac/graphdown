import { parseMarkdownRecord } from './markdownRecord';
import type { ValidationError } from '../validate/errors';
import { isRecordFileBytes } from './datasetObjects';

export type ParsedPluginManifest = {
  file: string;
  yaml: Record<string, unknown>;
  body: string;
};

function hasFrontMatterAtByte0(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false;
  if (bytes[0] !== 0x2d || bytes[1] !== 0x2d || bytes[2] !== 0x2d) return false;
  return bytes[3] === 0x0a || bytes[3] === 0x0d;
}

function decodeUtf8OrNull(bytes: Uint8Array): string | null {
  if (typeof TextDecoder !== 'undefined') {
    try {
      const decoder = new TextDecoder('utf-8', { fatal: true });
      return decoder.decode(bytes);
    } catch {
      return null;
    }
  }
  if (typeof Buffer !== 'undefined') {
    try {
      const buffer = Buffer.from(bytes);
      const text = buffer.toString('utf8');
      const roundTrip = Buffer.from(text, 'utf8');
      if (!roundTrip.equals(buffer)) return null;
      return text;
    } catch {
      return null;
    }
  }
  return null;
}

export function parsePluginManifest(
  text: string,
  filePath: string
):
  | { ok: true; manifest: ParsedPluginManifest }
  | { ok: false; error: ValidationError } {
  const parsed = parseMarkdownRecord(text, filePath);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }
  return {
    ok: true,
    manifest: {
      file: filePath,
      yaml: parsed.yaml,
      body: parsed.body,
    },
  };
}

export function isSafeRelativePath(p: string): boolean {
  if (typeof p !== 'string') return false;
  if (p.trim().length === 0) return false;
  if (p !== p.trim()) return false;

  if (p.startsWith('/')) return false;
  if (p.startsWith('./')) return false;

  if (p.includes('\0')) return false;
  if (p.includes('\\')) return false;

  const segments = p.split('/');
  if (segments.length === 0) return false;

  for (const seg of segments) {
    if (!seg) return false;
    if (seg === '.') return false;
    if (seg === '..') return false;
  }

  return true;
}

export function resolvePluginBundlePaths(
  manifestPath: string,
  files: string[]
): Map<string, string> {
  const normalizedManifestPath = manifestPath.replace(/\\/g, '/');
  const lastSlash = normalizedManifestPath.lastIndexOf('/');
  const manifestDir = lastSlash === -1 ? '' : normalizedManifestPath.slice(0, lastSlash);

  const resolved = new Map<string, string>();
  for (const p of files) {
    const resolvedPath = manifestDir ? `${manifestDir}/${p}` : p;
    resolved.set(p, resolvedPath);
  }
  return resolved;
}

export function isPluginManifestCandidateBytes(path: string, bytes: Uint8Array): boolean {
  if (!path.toLowerCase().endsWith('.md')) return false;
  if (!hasFrontMatterAtByte0(bytes)) return false;

  const text = decodeUtf8OrNull(bytes);
  if (text === null) return false;

  const parsed = parsePluginManifest(text, path);
  if (!parsed.ok) return false;

  const yaml = parsed.manifest.yaml;
  if (isRecordFileBytes(path, bytes) && Object.prototype.hasOwnProperty.call(yaml, 'typeId')) {
    return false;
  }
  const hasPluginId = Object.prototype.hasOwnProperty.call(yaml, 'pluginId');
  const hasApiVersion = Object.prototype.hasOwnProperty.call(yaml, 'gdApiVersion');
  return hasPluginId && hasApiVersion;
}
