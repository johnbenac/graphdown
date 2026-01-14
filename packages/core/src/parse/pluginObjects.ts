import type { DatasetSnapshot } from '../model/snapshotTypes';
import { decodeUtf8Strict } from '../internal/text';
import type { ParsedPluginManifest } from './pluginManifest';
import {
  isPluginManifestCandidateBytes,
  parsePluginManifest,
  resolvePluginBundlePaths,
} from './pluginManifest';

export type DiscoveredPluginObject = {
  manifest: ParsedPluginManifest;
  /**
   * Mapping from declared manifest.files[] entries → resolved dataset-relative paths (PLUG-LAYOUT-002).
   * Empty if manifest.yaml.files is missing or not string[].
   */
  resolvedFiles: Map<string, string>;
};

export type DiscoveredPluginObjects = {
  /**
   * Deterministic, sorted lexicographically by manifest path (PLUG-UTIL-001).
   */
  plugins: DiscoveredPluginObject[];
  /**
   * Set of manifest paths discovered per PLUG-LAYOUT-001.
   */
  pluginManifestPaths: Set<string>;
  /**
   * Union of resolved bundle file paths (only for manifests whose yaml.files is string[]).
   */
  pluginBundlePaths: Set<string>;
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((x) => typeof x === 'string');
}

export function discoverPluginObjects(snapshot: DatasetSnapshot): DiscoveredPluginObjects {
  const pluginManifestPaths = new Set<string>();
  const pluginBundlePaths = new Set<string>();
  const plugins: DiscoveredPluginObject[] = [];

  const paths = [...snapshot.files.keys()].sort((a, b) => a.localeCompare(b));

  for (const path of paths) {
    const bytes = snapshot.files.get(path);
    if (!bytes) continue;

    // PLUG-LAYOUT-001 discovery (candidate manifests).
    if (!isPluginManifestCandidateBytes(path, bytes)) {
      continue;
    }

    // Decode and parse (PLUG-FR-001).
    const decoded = decodeUtf8Strict(bytes);
    if (!decoded.ok) {
      // CandidateBytes already implies decode success; keep this defensive and skip.
      continue;
    }

    const parsed = parsePluginManifest(decoded.text, path);
    if (!parsed.ok) {
      // CandidateBytes already implies parse success; keep defensive and skip.
      continue;
    }

    pluginManifestPaths.add(path);

    // Resolve bundle paths (PLUG-LAYOUT-002) when files[] is well-formed.
    const yaml = parsed.manifest.yaml;
    const files = yaml.files;

    let resolvedFiles = new Map<string, string>();
    if (isStringArray(files)) {
      resolvedFiles = resolvePluginBundlePaths(path, files);
      for (const resolvedPath of resolvedFiles.values()) {
        pluginBundlePaths.add(resolvedPath);
      }
    }

    plugins.push({ manifest: parsed.manifest, resolvedFiles });
  }

  // PLUG-UTIL-001: deterministic ordering rule.
  plugins.sort((a, b) => a.manifest.file.localeCompare(b.manifest.file));

  return { plugins, pluginManifestPaths, pluginBundlePaths };
}
