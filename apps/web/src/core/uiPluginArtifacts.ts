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

export function tryParseUiPluginId(bytes: Uint8Array): { pluginId: string } | null {
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
  if (typeof raw.id !== 'string' || !PLUGIN_ID_PATTERN.test(raw.id)) return null;
  return { pluginId: raw.id };
}

export function parseUiPluginIdOrThrow(bytes: Uint8Array, path: string): { pluginId: string } {
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
): Array<{ pluginId: string; rootDir: string; manifestPath: string | null }> {
  const result: Array<{ pluginId: string; rootDir: string; manifestPath: string | null }> = [];
  const seen = new Map<string, string>();
  const paths = [...files.keys()].sort((a, b) => a.localeCompare(b));

  const register = (pluginId: string, rootDir: string, manifestPath: string | null) => {
    const existing = seen.get(pluginId);
    if (existing && existing.startsWith('plugins/')) {
      throw new PluginManifestError(`Duplicate plugin id "${pluginId}" discovered at ${manifestPath ?? rootDir}`);
    }
    if (existing) {
      // keep first (lexicographically smallest path wins)
      return;
    }
    seen.set(pluginId, manifestPath ?? rootDir);
    result.push({ pluginId, rootDir, manifestPath });
  };

  for (const path of paths) {
    if (path.startsWith('plugins/')) {
      const segments = path.split('/');
      if (segments.length < 2) continue;
      const pluginId = segments[1];
      if (!PLUGIN_ID_PATTERN.test(pluginId)) {
        throw new PluginManifestError(`Plugin id "${pluginId}" is invalid (path: ${path})`);
      }
      const rootDir = `plugins/${pluginId}`;
      if (isUiPluginManifestCandidate(path)) {
        const bytes = files.get(path);
        if (!bytes) {
          throw new PluginManifestError(`Plugin manifest missing bytes at ${path}`);
        }
        const parsed = parseUiPluginIdOrThrow(bytes, path);
        if (parsed.pluginId !== pluginId) {
          throw new PluginManifestError(
            `Plugin id mismatch for manifest at ${path}: expected ${pluginId}, found ${parsed.pluginId}`
          );
        }
      }
      register(pluginId, rootDir, null);
      continue;
    }

    if (!isUiPluginManifestCandidate(path)) continue;
    const bytes = files.get(path);
    if (!bytes) continue;
    const parsed = tryParseUiPluginId(bytes);
    if (!parsed) continue;
    const rootDir = dirname(path);
    if (!rootDir) continue; // ignore dataset-root manifests
    register(parsed.pluginId, rootDir, path);
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
