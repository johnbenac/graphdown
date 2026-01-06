import { isObject } from './types';

const PLUGIN_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
const MANIFEST_BASENAMES = new Set(["plugin.json", "manifest.json"]);

type SeenPlugin = {
  pluginId: string;
  rootDir: string;
  source: "canonical" | "discovered";
  manifestPath: string | null;
};

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
  const seen = new Map<string, SeenPlugin>();
  const paths = [...files.keys()].sort((a, b) => a.localeCompare(b));

  const upsertResult = (entry: { pluginId: string; rootDir: string; manifestPath: string | null }) => {
    const existingIdx = result.findIndex((item) => item.pluginId === entry.pluginId);
    if (existingIdx === -1) {
      result.push(entry);
    } else {
      result[existingIdx] = entry;
    }
  };

  const register = (next: SeenPlugin) => {
    const existing = seen.get(next.pluginId);
    if (!existing) {
      seen.set(next.pluginId, next);
      upsertResult({ pluginId: next.pluginId, rootDir: next.rootDir, manifestPath: next.manifestPath });
      return;
    }

    // Same plugin root seen again (e.g., multiple files in the same directory) is fine.
    if (existing.rootDir === next.rootDir) {
      if (!existing.manifestPath && next.manifestPath) {
        const updated: SeenPlugin = { ...existing, manifestPath: next.manifestPath };
        seen.set(next.pluginId, updated);
        upsertResult({ pluginId: updated.pluginId, rootDir: updated.rootDir, manifestPath: updated.manifestPath });
      }
      return;
    }

    // Canonical plugins always win over discovered locations.
    if (existing.source === "canonical" && next.source === "discovered") {
      return;
    }
    if (existing.source === "discovered" && next.source === "canonical") {
      seen.set(next.pluginId, next);
      upsertResult({ pluginId: next.pluginId, rootDir: next.rootDir, manifestPath: next.manifestPath });
      return;
    }

    // Two distinct roots for the same plugin id is a real conflict.
    throw new PluginManifestError(
      `Duplicate plugin id "${next.pluginId}" discovered at ${next.manifestPath ?? next.rootDir}; previously at ${existing.manifestPath ?? existing.rootDir}`
    );
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
      register({ pluginId, rootDir, source: 'canonical', manifestPath: null });
      continue;
    }

    if (!isUiPluginManifestCandidate(path)) continue;
    const bytes = files.get(path);
    if (!bytes) continue;
    const parsed = tryParseUiPluginId(bytes);
    if (!parsed) continue;
    const rootDir = dirname(path);
    if (!rootDir) continue; // ignore dataset-root manifests
    register({ pluginId: parsed.pluginId, rootDir, source: 'discovered', manifestPath: path });
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
