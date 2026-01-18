import type { TextDecoder as UtilTextDecoder } from "node:util";

import {
  collectDeclaredPluginBundleRelPaths,
  isPluginManifestCandidateBytes,
  isRecordFileBytes,
  parsePluginManifest,
  resolvePluginBundlePaths,
  type DatasetSnapshot
} from "@graphdown/core";

declare const TextDecoder: typeof UtilTextDecoder;

export type SemanticSelectionResult = {
  snapshot: DatasetSnapshot;
  ignored: string[];
  requiredPluginBundlePaths: string[];
  missingPluginBundlePaths: string[];
  pluginManifestPaths: string[];
};

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

  for (const [path, contents] of entries) {
    if (path.startsWith("blocks/")) {
      files.set(path, contents);
      continue;
    }

    const isRecord = isRecordFileBytes(path, contents);
    if (isRecord) {
      files.set(path, contents);
    }

    if (isPluginManifestCandidateBytes(path, contents)) {
      pluginManifestPaths.push(path);
    }
  }

  const requiredBundlePaths = new Set<string>();
  const sortedManifestPaths = [...pluginManifestPaths].sort((a, b) => a.localeCompare(b));

  for (const manifestPath of sortedManifestPaths) {
    const manifestBytes = entries.get(manifestPath);
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

    const declared = collectDeclaredPluginBundleRelPaths(parsed.manifest.yaml, manifestPath);
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

  const missingBundlePaths: string[] = [];
  for (const bundlePath of requiredBundlePaths) {
    const bundleBytes = entries.get(bundlePath);
    if (!bundleBytes) {
      missingBundlePaths.push(bundlePath);
      continue;
    }
    files.set(bundlePath, bundleBytes);
  }

  const ignored: string[] = [];
  for (const path of entries.keys()) {
    if (!files.has(path)) {
      ignored.push(path);
    }
  }

  ignored.sort((a, b) => a.localeCompare(b));

  const sortedRequired = [...requiredBundlePaths].sort((a, b) => a.localeCompare(b));
  const sortedMissing = [...new Set(missingBundlePaths)].sort((a, b) =>
    a.localeCompare(b)
  );

  return {
    snapshot: { files },
    ignored,
    requiredPluginBundlePaths: sortedRequired,
    missingPluginBundlePaths: sortedMissing,
    pluginManifestPaths: sortedManifestPaths
  };
}
