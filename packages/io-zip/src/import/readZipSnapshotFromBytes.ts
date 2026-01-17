import type { TextDecoder as UtilTextDecoder } from "node:util";

import { unzipSync } from "fflate";
import {
  isPluginManifestCandidateBytes,
  isRecordFileBytes,
  parsePluginManifest,
  resolvePluginBundlePaths,
  type DatasetSnapshot
} from "@graphdown/core";

import { normalizeZipEntryPath } from "../internal/zipPath";

const ROOT_DIRS = new Set(["types", "records", "blocks", "plugins"]);

declare const TextDecoder: typeof UtilTextDecoder;

type ZipEntry = {
  path: string;
  contents: Uint8Array;
};

type DeclaredBundles = {
  manifestPath: string;
  declared: string[];
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

function ensureStringArray(
  value: unknown,
  field: string,
  manifestPath: string
): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`Plugin manifest ${manifestPath} has invalid ${field}: expected string[]`);
  }
  const strings: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") {
      throw new Error(`Plugin manifest ${manifestPath} has invalid ${field}: expected string[]`);
    }
    strings.push(entry);
  }
  return strings;
}

function collectDeclaredBundles(manifestPath: string, yaml: Record<string, unknown>): DeclaredBundles {
  const declared: string[] = [];

  if (Object.prototype.hasOwnProperty.call(yaml, "entry")) {
    const entry = yaml.entry;
    if (typeof entry !== "string") {
      throw new Error(`Plugin manifest ${manifestPath} has invalid entry: expected string`);
    }
    declared.push(entry);
  }

  if (Object.prototype.hasOwnProperty.call(yaml, "files")) {
    declared.push(...ensureStringArray(yaml.files, "files", manifestPath));
  }

  if (Object.prototype.hasOwnProperty.call(yaml, "binaryFiles")) {
    declared.push(...ensureStringArray(yaml.binaryFiles, "binaryFiles", manifestPath));
  }

  return { manifestPath, declared };
}

function normalizeZipEntries(entries: Record<string, Uint8Array>): ZipEntry[] {
  const normalizedEntries: ZipEntry[] = [];
  const seen = new Set<string>();

  const sortedEntries = Object.entries(entries).sort(([a], [b]) => a.localeCompare(b));
  for (const [entryPath, contents] of sortedEntries) {
    const normalizedPath = normalizeZipEntryPath(entryPath);
    if (seen.has(normalizedPath)) {
      throw new Error(`Zip entry path collision: ${normalizedPath}`);
    }
    seen.add(normalizedPath);

    if (entryPath.replace(/\\/g, "/").endsWith("/")) {
      continue;
    }

    normalizedEntries.push({ path: normalizedPath, contents });
  }

  return normalizedEntries;
}

function stripRootDirectory(entries: ZipEntry[]): Map<string, Uint8Array> {
  const topLevelSegments = new Set<string>();
  for (const entry of entries) {
    topLevelSegments.add(entry.path.split("/")[0]);
  }

  const sortedTopLevels = [...topLevelSegments].sort((a, b) => a.localeCompare(b));
  const shouldStrip =
    sortedTopLevels.length === 1 &&
    Boolean(sortedTopLevels[0]) &&
    !ROOT_DIRS.has(sortedTopLevels[0]);

  const allEntries = new Map<string, Uint8Array>();
  for (const entry of entries) {
    const finalPath = shouldStrip ? entry.path.split("/").slice(1).join("/") : entry.path;
    if (!finalPath) {
      throw new Error(`Zip entry resolves to empty path after root stripping: ${entry.path}`);
    }
    if (allEntries.has(finalPath)) {
      throw new Error(`Zip entry path collision: ${finalPath}`);
    }
    allEntries.set(finalPath, entry.contents);
  }

  return allEntries;
}

export function readZipSnapshotFromBytes(
  zipBytes: Uint8Array
): { snapshot: DatasetSnapshot; ignored: string[] } {
  const entries = unzipSync(zipBytes);
  const normalizedEntries = normalizeZipEntries(entries);
  const allEntries = stripRootDirectory(normalizedEntries);

  const files = new Map<string, Uint8Array>();
  const ignored = new Set<string>();
  const pluginManifestPaths: string[] = [];

  const sortedPaths = [...allEntries.keys()].sort((a, b) => a.localeCompare(b));
  for (const path of sortedPaths) {
    const contents = allEntries.get(path);
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
      continue;
    }

    ignored.add(path);
  }

  const declaredBundles: DeclaredBundles[] = [];
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

    declaredBundles.push(collectDeclaredBundles(manifestPath, parsed.manifest.yaml));
  }

  const missingBundles: string[] = [];
  for (const { manifestPath, declared } of declaredBundles) {
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
      const bundleBytes = allEntries.get(resolvedPath);
      if (!bundleBytes) {
        missingBundles.push(resolvedPath);
        continue;
      }
      files.set(resolvedPath, bundleBytes);
      ignored.delete(resolvedPath);
    }
  }

  if (missingBundles.length > 0) {
    const sortedMissing = [...new Set(missingBundles)].sort((a, b) => a.localeCompare(b));
    throw new Error(`Missing plugin bundle files: ${sortedMissing.join(", ")}`);
  }

  const finalIgnored: string[] = [];
  for (const path of allEntries.keys()) {
    if (!files.has(path)) {
      finalIgnored.push(path);
    }
  }

  finalIgnored.sort((a, b) => a.localeCompare(b));

  return { snapshot: { files }, ignored: finalIgnored };
}
