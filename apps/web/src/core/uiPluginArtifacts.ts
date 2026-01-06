import { isObject } from './types';

const PLUGIN_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

export function basename(path: string): string {
  const segments = path.split('/');
  return segments[segments.length - 1] ?? '';
}

export function dirname(path: string): string {
  const segments = path.split('/');
  if (segments.length <= 1) return '';
  return segments.slice(0, -1).join('/');
}

export function isUnderDir(path: string, dir: string): boolean {
  if (!dir) return false;
  return path === dir || path.startsWith(`${dir}/`);
}

export function isUiConfigCandidate(path: string): boolean {
  return basename(path) === 'graphdown.ui.json';
}

export function isUiPluginManifestCandidate(path: string): boolean {
  return basename(path) === 'plugin.json';
}

type ParsedProvider = {
  capability: string;
  match: Record<string, string>;
  entry: string;
};

export type ParsedUiPluginManifest = {
  schemaVersion: 1;
  id: string;
  version: string;
  main: string;
  provides: ParsedProvider[];
};

function isMatchObject(value: unknown): value is Record<string, string> {
  if (!isObject(value)) return false;
  return Object.values(value).every((entry) => typeof entry === 'string');
}

function isValidMainPath(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (!value.trim()) return false;
  if (value.startsWith('/')) return false;
  if (value.includes('\\')) return false;
  const segments = value.split('/');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) return false;
  return true;
}

function validateProvider(value: unknown): value is ParsedProvider {
  if (!isObject(value)) return false;
  if (value.capability !== 'field.view') return false;
  if (!isMatchObject(value.match)) return false;
  if (typeof value.entry !== 'string') return false;
  return true;
}

export function parseUiPluginManifest(bytes: Uint8Array): ParsedUiPluginManifest | null {
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isObject(raw)) return null;
  if (raw.schemaVersion !== 1) return null;
  if (typeof raw.id !== 'string' || !PLUGIN_ID_PATTERN.test(raw.id)) return null;
  if (typeof raw.version !== 'string' || !VERSION_PATTERN.test(raw.version)) return null;
  const main = raw.main === undefined ? 'plugin.js' : raw.main;
  if (!isValidMainPath(main)) return null;
  if (!Array.isArray(raw.provides) || !raw.provides.every(validateProvider)) return null;
  return {
    schemaVersion: 1,
    id: raw.id,
    version: raw.version,
    main,
    provides: raw.provides,
  };
}

export function discoverUiPluginPackages(
  files: Map<string, Uint8Array>
): Array<{ pluginId: string; rootDir: string; manifestPath: string }> {
  const result: Array<{ pluginId: string; rootDir: string; manifestPath: string }> = [];
  const seen = new Set<string>();
  const paths = [...files.keys()].sort((a, b) => a.localeCompare(b));
  for (const path of paths) {
    if (!isUiPluginManifestCandidate(path)) continue;
    const rootDir = dirname(path);
    if (!rootDir) continue; // disallow dataset-root plugin
    const bytes = files.get(path);
    if (!bytes) continue;
    const manifest = parseUiPluginManifest(bytes);
    if (!manifest) continue;
    if (seen.has(manifest.id)) continue; // first manifest wins (paths are sorted)
    seen.add(manifest.id);
    result.push({ pluginId: manifest.id, rootDir, manifestPath: path });
  }
  return result;
}

export function selectUiConfigPath(files: Map<string, Uint8Array>): string | null {
  const candidates = [...files.keys()].filter(isUiConfigCandidate).sort((a, b) => a.localeCompare(b));
  return candidates[0] ?? null;
}
