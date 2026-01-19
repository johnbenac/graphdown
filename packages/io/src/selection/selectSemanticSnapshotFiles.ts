import {
  collectDeclaredPluginBundleRelPaths,
  isPluginManifestCandidateBytes,
  isRecordFileBytes,
  parsePluginManifest,
  resolvePluginBundlePaths,
  type DatasetSnapshot
} from "@graphdown/core";

// Keep @graphdown/io portable: do not import node:util types.
// Type-only node imports can leak into consumer type environments / generated .d.ts.
type TextDecoderCtor = new (
  label?: string,
  options?: { fatal?: boolean; ignoreBOM?: boolean }
) => { decode(input?: Uint8Array): string };

function getTextDecoderCtor(): TextDecoderCtor | undefined {
  return (globalThis as unknown as { TextDecoder?: TextDecoderCtor }).TextDecoder;
}

export type SemanticSelectionResult = {
  snapshot: DatasetSnapshot;
  ignored: string[];
  requiredPluginBundlePaths: string[];
  missingPluginBundlePaths: string[];
  pluginManifestPaths: string[];
};

function decodeUtf8Strict(bytes: Uint8Array, filePath: string): string {
  const TextDecoderImpl = getTextDecoderCtor();
  if (!TextDecoderImpl) {
    throw new Error(`TextDecoder is not available for plugin manifest ${filePath}`);
  }
  const decoder = new TextDecoderImpl("utf-8", { fatal: true });
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
    if (!isRecord) {
      continue;
    }

    files.set(path, contents);
    if (isPluginManifestCandidateBytes(path, contents)) {
      pluginManifestPaths.push(path);
    }
  }

  const requiredBundlePaths = new Set<string>();
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
      if (typeof resolvedPath !== "string") {
        throw new Error(`Plugin manifest ${manifestPath} resolved invalid bundle path`);
      }
      requiredBundlePaths.add(resolvedPath);
    }
  }

  const missingBundles: string[] = [];
  for (const bundlePath of requiredBundlePaths) {
    const bundleBytes = entries.get(bundlePath);
    if (!bundleBytes) {
      missingBundles.push(bundlePath);
      continue;
    }
    files.set(bundlePath, bundleBytes);
  }

  const missingPluginBundlePaths = [...new Set(missingBundles)].sort((a, b) =>
    a.localeCompare(b)
  );
  const requiredPluginBundlePaths = [...requiredBundlePaths].sort((a, b) =>
    a.localeCompare(b)
  );

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
    requiredPluginBundlePaths,
    missingPluginBundlePaths,
    pluginManifestPaths: sortedManifests
  };
}
