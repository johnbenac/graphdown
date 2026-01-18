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

  const requiredPluginBundlePaths = new Set<string>();
  const sortedManifests = [...pluginManifestPaths].sort((a, b) => a.localeCompare(b));
  for (const manifestPath of sortedManifests) {
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

    const declaredRelPaths = collectDeclaredPluginBundleRelPaths(
      parsed.manifest.yaml,
      manifestPath
    );
    if (declaredRelPaths.length === 0) {
      continue;
    }

    const resolved = resolvePluginBundlePaths(manifestPath, declaredRelPaths);
    for (const resolvedPath of resolved.values()) {
      requiredPluginBundlePaths.add(resolvedPath);
    }
  }

  const missingPluginBundlePaths = new Set<string>();
  for (const resolvedPath of requiredPluginBundlePaths) {
    const bundleBytes = entries.get(resolvedPath);
    if (!bundleBytes) {
      missingPluginBundlePaths.add(resolvedPath);
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
    requiredPluginBundlePaths: [...requiredPluginBundlePaths].sort((a, b) =>
      a.localeCompare(b)
    ),
    missingPluginBundlePaths: [...missingPluginBundlePaths].sort((a, b) =>
      a.localeCompare(b)
    ),
    pluginManifestPaths: [...pluginManifestPaths].sort((a, b) => a.localeCompare(b))
  };
}
