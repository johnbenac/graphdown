import { unzipSync } from "fflate";
import {
  isRecordFileBytes,
  isPluginManifestCandidateBytes,
  parsePluginManifest,
  resolvePluginBundlePaths,
  type DatasetSnapshot
} from "@graphdown/core";

import { normalizeZipEntryPath } from "../zip/normalizeZipEntryPath";

const ROOT_DIRS = new Set(["types", "records", "blocks", "plugins"]);

function collectDeclaredBundlePaths(
  manifestPath: string,
  yaml: Record<string, unknown>
): Set<string> {
  const declared = new Set<string>();

  if (Object.prototype.hasOwnProperty.call(yaml, "entry")) {
    const entry = yaml.entry;
    if (typeof entry !== "string") {
      throw new Error(`Plugin manifest ${manifestPath} has invalid entry value`);
    }
    declared.add(entry);
  }

  if (Object.prototype.hasOwnProperty.call(yaml, "files")) {
    const files = yaml.files;
    if (!Array.isArray(files) || !files.every((file) => typeof file === "string")) {
      throw new Error(`Plugin manifest ${manifestPath} has invalid files list`);
    }
    for (const file of files) {
      declared.add(file);
    }
  }

  if (Object.prototype.hasOwnProperty.call(yaml, "binaryFiles")) {
    const files = yaml.binaryFiles;
    if (!Array.isArray(files) || !files.every((file) => typeof file === "string")) {
      throw new Error(`Plugin manifest ${manifestPath} has invalid binaryFiles list`);
    }
    for (const file of files) {
      declared.add(file);
    }
  }

  return declared;
}

function normalizeEntries(entries: Record<string, Uint8Array>): Array<{ path: string; contents: Uint8Array }> {
  const normalizedEntries: Array<{ path: string; contents: Uint8Array }> = [];
  const seenPaths = new Map<string, string>();

  const entryPaths = Object.keys(entries).sort((a, b) => a.localeCompare(b));
  for (const entryPath of entryPaths) {
    const normalizedEntryPath = entryPath.replace(/\\/g, "/");
    const isDir = normalizedEntryPath.endsWith("/");
    const normalizedPath = normalizeZipEntryPath(normalizedEntryPath);
    const existing = seenPaths.get(normalizedPath);
    if (existing) {
      throw new Error(
        `Zip entry path collision: ${existing} and ${entryPath} normalize to ${normalizedPath}`
      );
    }
    seenPaths.set(normalizedPath, entryPath);
    if (isDir) {
      continue;
    }
    normalizedEntries.push({ path: normalizedPath, contents: entries[entryPath] });
  }

  return normalizedEntries;
}

export function readZipSnapshotFromBytes(
  zipBytes: Uint8Array
): { snapshot: DatasetSnapshot; ignored: string[] } {
  const entries = unzipSync(zipBytes);
  const normalizedEntries = normalizeEntries(entries);
  const decoder = new TextDecoder("utf-8");

  const rootSegments = new Set<string>();
  for (const entry of normalizedEntries) {
    rootSegments.add(entry.path.split("/")[0]);
  }
  const [rootSegment] = rootSegments;
  const shouldStripRoot =
    rootSegments.size === 1 && Boolean(rootSegment) && !ROOT_DIRS.has(rootSegment);

  const allEntries = new Map<string, Uint8Array>();
  for (const entry of normalizedEntries) {
    const finalPath = shouldStripRoot ? entry.path.split("/").slice(1).join("/") : entry.path;
    if (!finalPath) {
      throw new Error(`Zip entry path resolved to empty after root stripping: ${entry.path}`);
    }
    allEntries.set(finalPath, entry.contents);
  }

  const files = new Map<string, Uint8Array>();
  const ignored = new Set<string>();
  const pluginManifestPaths: string[] = [];

  for (const [path, contents] of allEntries) {
    if (path.startsWith("blocks/")) {
      files.set(path, contents);
      continue;
    }
    const isRecord = isRecordFileBytes(path, contents);
    const isManifest = isPluginManifestCandidateBytes(path, contents);
    if (!isManifest && isRecord) {
      const text = decoder.decode(contents);
      const hasPluginHints =
        /(^|[\r\n])\s*pluginId\s*:/m.test(text) &&
        /(^|[\r\n])\s*gdApiVersion\s*:/m.test(text);
      if (hasPluginHints) {
        const parsed = parsePluginManifest(text, path);
        if (!parsed.ok) {
          throw new Error(
            `Plugin manifest parse failed for ${path}: ${parsed.error.code} ${parsed.error.message}`
          );
        }
      }
    }
    if (isRecord || isManifest) {
      files.set(path, contents);
      if (isManifest) {
        pluginManifestPaths.push(path);
      }
      continue;
    }
    ignored.add(path);
  }

  pluginManifestPaths.sort((a, b) => a.localeCompare(b));

  const missingBundlePaths = new Set<string>();

  for (const manifestPath of pluginManifestPaths) {
    const manifestBytes = files.get(manifestPath);
    if (!manifestBytes) {
      throw new Error(`Plugin manifest missing from snapshot: ${manifestPath}`);
    }
    const text = decoder.decode(manifestBytes);
    const parsed = parsePluginManifest(text, manifestPath);
    if (!parsed.ok) {
      throw new Error(
        `Plugin manifest parse failed for ${manifestPath}: ${parsed.error.code} ${parsed.error.message}`
      );
    }

    const declaredPaths = collectDeclaredBundlePaths(manifestPath, parsed.manifest.yaml);
    if (declaredPaths.size === 0) {
      continue;
    }

    let resolved: Map<string, string>;
    try {
      resolved = resolvePluginBundlePaths(manifestPath, [...declaredPaths]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Plugin manifest ${manifestPath} bundle resolution failed: ${message}`);
    }

    for (const resolvedPath of resolved.values()) {
      const bundleBytes = allEntries.get(resolvedPath);
      if (!bundleBytes) {
        missingBundlePaths.add(resolvedPath);
        continue;
      }
      files.set(resolvedPath, bundleBytes);
      ignored.delete(resolvedPath);
    }
  }

  if (missingBundlePaths.size > 0) {
    const missing = [...missingBundlePaths].sort((a, b) => a.localeCompare(b));
    throw new Error(`Plugin bundle files missing from zip: ${missing.join(", ")}`);
  }

  const finalIgnored = [...allEntries.keys()]
    .filter((path) => !files.has(path))
    .sort((a, b) => a.localeCompare(b));

  return { snapshot: { files }, ignored: finalIgnored };
}
