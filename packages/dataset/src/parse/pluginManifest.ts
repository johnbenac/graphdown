import { parseMarkdownRecord } from './markdownRecord.js';
import type { ValidationError } from '../validate/errors.js';
import { decodeUtf8Strict } from '../internal/text.js';
import { isRecordFileBytes } from './recordFile.js';

export type ParsedPluginManifest = {
  file: string;
  yaml: Record<string, unknown>;
  body: string;
};

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

export function collectDeclaredPluginBundleRelPaths(
  yaml: Record<string, unknown>,
  manifestPath: string
): string[] {
  const declared: string[] = [];
  const seen = new Set<string>();

  const addPath = (value: string, field: string) => {
    if (!isSafeRelativePath(value)) {
      throw new Error(
        `Plugin manifest ${manifestPath} has invalid ${field}: expected safe relative path`
      );
    }
    if (seen.has(value)) {
      return;
    }
    seen.add(value);
    declared.push(value);
  };

  const addStringArray = (value: unknown, field: string) => {
    if (!Array.isArray(value)) {
      throw new Error(`Plugin manifest ${manifestPath} has invalid ${field}: expected string[]`);
    }
    for (const entry of value) {
      if (typeof entry !== 'string') {
        throw new Error(
          `Plugin manifest ${manifestPath} has invalid ${field}: expected string[]`
        );
      }
      addPath(entry, field);
    }
  };

  if (Object.prototype.hasOwnProperty.call(yaml, 'entry')) {
    const entry = yaml.entry;
    if (typeof entry !== 'string') {
      throw new Error(`Plugin manifest ${manifestPath} has invalid entry: expected string`);
    }
    addPath(entry, 'entry');
  }

  if (Object.prototype.hasOwnProperty.call(yaml, 'files')) {
    addStringArray(yaml.files, 'files');
  }

  if (Object.prototype.hasOwnProperty.call(yaml, 'binaryFiles')) {
    addStringArray(yaml.binaryFiles, 'binaryFiles');
  }

  return declared;
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
  if (!isRecordFileBytes(path, bytes)) return false;

  const decoded = decodeUtf8Strict(bytes);
  if (!decoded.ok) return false;
  const text = decoded.text;

  const parsed = parsePluginManifest(text, path);
  if (!parsed.ok) return false;

  const yaml = parsed.manifest.yaml;
  if (Object.prototype.hasOwnProperty.call(yaml, 'typeId')) return false;
  const hasPluginId = Object.prototype.hasOwnProperty.call(yaml, 'pluginId');
  const hasApiVersion = Object.prototype.hasOwnProperty.call(yaml, 'gdApiVersion');
  return hasPluginId && hasApiVersion;
}
