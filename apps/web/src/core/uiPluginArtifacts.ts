import { isObject } from './types';

const PLUGIN_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
const MANIFEST_BASENAMES = new Set(["plugin.json", "manifest.json"]);

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
  return MANIFEST_BASENAMES.has(basename(path));
}

export class PluginManifestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PluginManifestError';
  }
}

export function parseUiPluginManifest(bytes: Uint8Array, path: string): { pluginId: string } {
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new PluginManifestError(`Plugin manifest at ${path} is not valid UTF-8`);
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new PluginManifestError(`Plugin manifest at ${path} is not valid JSON`);
  }
  if (!isObject(raw)) {
    throw new PluginManifestError(`Plugin manifest at ${path} must be a JSON object`);
  }
  if (typeof raw.id !== 'string' || !PLUGIN_ID_PATTERN.test(raw.id)) {
    throw new PluginManifestError(`Plugin manifest at ${path} is missing a valid string id`);
  }
  return { pluginId: raw.id };
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
    if (!rootDir) {
      throw new PluginManifestError(`Plugin manifest must not be at dataset root: ${path}`);
    }
    const bytes = files.get(path);
    if (!bytes) continue;
    const manifest = parseUiPluginManifest(bytes, path);
    if (seen.has(manifest.pluginId)) {
      throw new PluginManifestError(
        `Duplicate plugin id "${manifest.pluginId}" discovered at ${path}`
      );
    }
    seen.add(manifest.pluginId);
    result.push({ pluginId: manifest.pluginId, rootDir, manifestPath: path });
  }
  return result;
}

export function selectUiConfigPathFromPaths(paths: Iterable<string>): string | null {
  const candidates = [...paths].filter(isUiConfigCandidate).sort((a, b) => a.localeCompare(b));
  return candidates[0] ?? null;
}

export function selectUiConfigPath(files: Map<string, Uint8Array>): string | null {
  return selectUiConfigPathFromPaths(files.keys());
}
