import { unzipSync } from "fflate";
import {
  isPluginManifestCandidateBytes,
  isRecordFileBytes,
  parsePluginManifest,
  resolvePluginBundlePaths,
  type DatasetSnapshot,
  type ParsedPluginManifest
} from "@graphdown/core";
import { normalizeZipEntryPath } from "../zip/normalizeZipEntryPath";

const ROOT_DIRS = new Set(["types", "records", "blocks", "plugins"]);
const decoder = new TextDecoder("utf-8");

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function containsPluginKeys(text: string): boolean {
  return /(^|\n)\s*pluginId\s*:/m.test(text) || /(^|\n)\s*gdApiVersion\s*:/m.test(text);
}

function isPluginManifestYaml(yaml: Record<string, unknown>): boolean {
  if (Object.prototype.hasOwnProperty.call(yaml, "typeId")) return false;
  const hasPluginId = Object.prototype.hasOwnProperty.call(yaml, "pluginId");
  const hasApiVersion = Object.prototype.hasOwnProperty.call(yaml, "gdApiVersion");
  return hasPluginId && hasApiVersion;
}

function getDeclaredBundlePaths(manifest: ParsedPluginManifest, manifestPath: string): string[] {
  const declared = new Set<string>();

  const entry = manifest.yaml.entry;
  if (entry !== undefined && typeof entry !== "string") {
    throw new Error(`Plugin manifest ${manifestPath} has invalid "entry" value`);
  }
  if (typeof entry === "string") {
    declared.add(entry);
  }

  const files = manifest.yaml.files;
  if (files !== undefined && !isStringArray(files)) {
    throw new Error(`Plugin manifest ${manifestPath} has invalid "files" value`);
  }
  if (Array.isArray(files)) {
    for (const file of files) {
      declared.add(file);
    }
  }

  const binaryFiles = manifest.yaml.binaryFiles;
  if (binaryFiles !== undefined && !isStringArray(binaryFiles)) {
    throw new Error(`Plugin manifest ${manifestPath} has invalid "binaryFiles" value`);
  }
  if (Array.isArray(binaryFiles)) {
    for (const file of binaryFiles) {
      declared.add(file);
    }
  }

  return [...declared];
}

export function readZipSnapshotFromBytes(
  zipBytes: Uint8Array
): { snapshot: DatasetSnapshot; ignored: string[] } {
  const entries = unzipSync(zipBytes);
  const sortedEntries = Object.entries(entries).sort((a, b) => a[0].localeCompare(b[0]));

  const normalizedEntries: Array<{ path: string; contents: Uint8Array }> = [];
  const seenPaths = new Map<string, string>();

  for (const [entryPath, contents] of sortedEntries) {
    const isDir = entryPath.endsWith("/");
    const pathForNormalize = isDir ? entryPath.slice(0, -1) : entryPath;
    const normalizedPath = normalizeZipEntryPath(pathForNormalize);
    const existing = seenPaths.get(normalizedPath);
    if (existing) {
      throw new Error(
        `Zip entry path collision for "${normalizedPath}": "${existing}" and "${entryPath}"`
      );
    }
    seenPaths.set(normalizedPath, entryPath);
    if (isDir) {
      continue;
    }
    normalizedEntries.push({ path: normalizedPath, contents });
  }

  const topLevelSegments = new Set<string>();
  for (const entry of normalizedEntries) {
    topLevelSegments.add(entry.path.split("/")[0]);
  }
  const sortedRoots = [...topLevelSegments].sort((a, b) => a.localeCompare(b));
  const singleRoot = sortedRoots.length === 1 ? sortedRoots[0] : null;
  const canStripRoot =
    Boolean(singleRoot) &&
    !ROOT_DIRS.has(singleRoot ?? "") &&
    normalizedEntries.every((entry) => entry.path.includes("/"));

  const allEntries = new Map<string, Uint8Array>();
  for (const entry of normalizedEntries) {
    const finalPath = canStripRoot ? entry.path.split("/").slice(1).join("/") : entry.path;
    if (!finalPath) {
      throw new Error(`Invalid zip entry path after root stripping: ${entry.path}`);
    }
    if (allEntries.has(finalPath)) {
      throw new Error(`Zip entry path collision for "${finalPath}" after root stripping`);
    }
    allEntries.set(finalPath, entry.contents);
  }

  const files = new Map<string, Uint8Array>();
  const pluginManifestPaths = new Set<string>();

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
    const isManifestCandidate = isPluginManifestCandidateBytes(path, contents);

    if (isRecord || isManifestCandidate) {
      files.set(path, contents);
    }

    if (isManifestCandidate) {
      pluginManifestPaths.add(path);
      continue;
    }

    if (isRecord) {
      const text = decoder.decode(contents);
      if (containsPluginKeys(text)) {
        const parsed = parsePluginManifest(text, path);
        if (!parsed.ok) {
          throw new Error(`Plugin manifest parse error in ${path}: ${parsed.error.message}`);
        }
        if (isPluginManifestYaml(parsed.manifest.yaml)) {
          pluginManifestPaths.add(path);
        }
      }
      continue;
    }
  }

  const missingBundleFiles: string[] = [];
  const sortedManifestPaths = [...pluginManifestPaths].sort((a, b) => a.localeCompare(b));
  for (const manifestPath of sortedManifestPaths) {
    const manifestBytes = files.get(manifestPath);
    if (!manifestBytes) {
      throw new Error(`Plugin manifest missing from snapshot: ${manifestPath}`);
    }
    const text = decoder.decode(manifestBytes);
    const parsed = parsePluginManifest(text, manifestPath);
    if (!parsed.ok) {
      throw new Error(`Plugin manifest parse error in ${manifestPath}: ${parsed.error.message}`);
    }

    const declaredPaths = getDeclaredBundlePaths(parsed.manifest, manifestPath).sort((a, b) =>
      a.localeCompare(b)
    );
    if (declaredPaths.length === 0) {
      continue;
    }

    let resolved: Map<string, string>;
    try {
      resolved = resolvePluginBundlePaths(manifestPath, declaredPaths);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Plugin manifest ${manifestPath} failed to resolve bundle paths: ${message}`);
    }

    for (const resolvedPath of resolved.values()) {
      const bundleBytes = allEntries.get(resolvedPath);
      if (!bundleBytes) {
        missingBundleFiles.push(`${resolvedPath} (declared in ${manifestPath})`);
        continue;
      }
      files.set(resolvedPath, bundleBytes);
    }
  }

  if (missingBundleFiles.length > 0) {
    const sortedMissing = [...new Set(missingBundleFiles)].sort((a, b) => a.localeCompare(b));
    throw new Error(`Missing plugin bundle files: ${sortedMissing.join(", ")}`);
  }

  const ignored = [...allEntries.keys()]
    .filter((path) => !files.has(path))
    .sort((a, b) => a.localeCompare(b));

  return { snapshot: { files }, ignored };
}
