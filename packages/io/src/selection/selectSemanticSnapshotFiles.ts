import type { TextDecoder as UtilTextDecoder } from "node:util";

import {
  collectDeclaredPluginBundleRelPaths,
  isPluginManifestCandidateBytes,
  isRecordFileBytes,
  parsePluginManifest,
  resolvePluginBundlePaths,
  type DatasetSnapshot
} from "@graphdown/core";

export type SemanticSelectionResult = {
  snapshot: DatasetSnapshot;
  ignored: string[];
  requiredPluginBundlePaths: string[];
  missingPluginBundlePaths: string[];
  pluginManifestPaths: string[];
};

declare const TextDecoder: typeof UtilTextDecoder;

function decodeUtf8Strict(bytes: Uint8Array, filePath: string): string {
  if (typeof TextDecoder === "undefined") {
    throw new Error(`TextDecoder is not available for plugin manifest ${filePath}`);
  }
  const decoder = new TextDecoder("utf-8", { fatal: true });
  try {
    return decoder.decode(bytes);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid UTF-8 in plugin manifest ${filePath}: ${message}`);
  }
}

export function selectSemanticSnapshotFiles(
  entries: Map<string, Uint8Array>
): SemanticSelectionResult {
  const files = new Map<string, Uint8Array>();
  const pluginManifestPaths: string[] = [];

  const sortedPaths = [...entries.keys()].sort((a, b) => a.localeCompare(b));
  for (const path of sortedPaths) {
    const contents = entries.get(path);
    if (!contents) {
      continue;
    }
    if (path.startsWith("blocks/")) {
      files.set(path, contents);
      continue;
    }

    const isRecord = isRecordFileBytes(path, contents);
    const isManifest = isPluginManifestCandidateBytes(path, contents);
    if (isRecord || isManifest) {
      files.set(path, contents);
      if (isManifest) {
        pluginManifestPaths.push(path);
      }
    }
  }

  const requiredBundlePaths = new Set<string>();
  const sortedManifests = [...pluginManifestPaths].sort((a, b) => a.localeCompare(b));
  for (const manifestPath of sortedManifests) {
    const manifestBytes = files.get(manifestPath);
    if (!manifestBytes) {
      throw new Error(`Plugin manifest missing from snapshot: ${manifestPath}`);
    }

    const text = decodeUtf8Strict(manifestBytes, manifestPath);
    const parsed = parsePluginManifest(text, manifestPath);
    if (!parsed.ok) {
      throw new Error(
        `Plugin manifest parse failed (${manifestPath}): ${parsed.error.message}`
      );
    }

    const declared = collectDeclaredPluginBundleRelPaths(
      parsed.manifest.yaml,
      manifestPath
    );
    if (declared.length === 0) {
      continue;
    }

    let resolved: Map<string, string>;
    try {
      resolved = resolvePluginBundlePaths(manifestPath, declared);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to resolve plugin bundles for ${manifestPath}: ${message}`);
    }

    for (const resolvedPath of resolved.values()) {
      requiredBundlePaths.add(resolvedPath);
    }
  }

  const missingBundles = new Set<string>();
  for (const resolvedPath of requiredBundlePaths) {
    const bundleBytes = entries.get(resolvedPath);
    if (!bundleBytes) {
      missingBundles.add(resolvedPath);
      continue;
    }
    files.set(resolvedPath, bundleBytes);
  }

  const ignored: string[] = [];
  for (const path of entries.keys()) {
    if (!files.has(path)) {
      ignored.push(path);
    }
  }

  ignored.sort((a, b) => a.localeCompare(b));

  return {
    snapshot: { files },
    ignored,
    requiredPluginBundlePaths: [...requiredBundlePaths].sort((a, b) =>
      a.localeCompare(b)
    ),
    missingPluginBundlePaths: [...missingBundles].sort((a, b) => a.localeCompare(b)),
    pluginManifestPaths: sortedManifests
  };
}
