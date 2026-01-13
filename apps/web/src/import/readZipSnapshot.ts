import { unzipSync } from "fflate";
import {
  isRecordFileBytes,
  isPluginManifestCandidateBytes,
  parsePluginManifest,
  resolvePluginBundlePaths,
  type DatasetSnapshot
} from "@graphdown/core";

const ROOT_DIRS = new Set(["types", "records", "blocks"]);

function normalizeZipPath(path: string): string | null {
  if (path.includes("\0")) {
    return null;
  }
  const normalized = path.replace(/\\/g, "/");
  if (normalized.startsWith("/")) {
    return null;
  }
  const segments = normalized.split("/");
  const safeSegments: string[] = [];
  for (const segment of segments) {
    if (!segment || segment === ".") {
      continue;
    }
    if (segment === "..") {
      return null;
    }
    safeSegments.push(segment);
  }
  if (!safeSegments.length) {
    return null;
  }
  return safeSegments.join("/");
}

function getDeclaredBundlePaths(manifest: { yaml: Record<string, unknown> }): Set<string> {
  const declared = new Set<string>();
  const entry = manifest.yaml.entry;
  if (typeof entry === "string") {
    declared.add(entry);
  }
  const files = manifest.yaml.files;
  if (Array.isArray(files)) {
    for (const file of files) {
      if (typeof file === "string") {
        declared.add(file);
      }
    }
  }
  return declared;
}

export async function readZipSnapshot(
  file: File
): Promise<{ snapshot: DatasetSnapshot; ignored: string[] }> {
  const buffer = await file.arrayBuffer();
  const entries = unzipSync(new Uint8Array(buffer));
  const normalizedEntries: Array<{ path: string; contents: Uint8Array }> = [];
  for (const [path, contents] of Object.entries(entries)) {
    const isDir = path.endsWith("/");
    const normalized = normalizeZipPath(path);
    if (!normalized) {
      throw new Error(`Zip entry has invalid path: ${path}`);
    }
    if (isDir) {
      continue;
    }
    normalizedEntries.push({ path: normalized, contents });
  }

  const root = normalizedEntries[0]?.path.split("/")[0];
  const shouldStripRoot =
    Boolean(root) &&
    !ROOT_DIRS.has(root) &&
    normalizedEntries.every((entry) => entry.path.startsWith(`${root}/`));
  const allEntries = new Map<string, Uint8Array>();
  for (const entry of normalizedEntries) {
    const finalPath = shouldStripRoot ? entry.path.split("/").slice(1).join("/") : entry.path;
    if (!finalPath) {
      continue;
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
    if (isRecord || isManifest) {
      files.set(path, contents);
      if (isManifest) {
        pluginManifestPaths.push(path);
      }
      continue;
    }
    ignored.add(path);
  }

  const decoder = new TextDecoder("utf-8");
  for (const manifestPath of pluginManifestPaths) {
    const manifestBytes = files.get(manifestPath);
    if (!manifestBytes) {
      continue;
    }
    const text = decoder.decode(manifestBytes);
    const parsed = parsePluginManifest(text, manifestPath);
    if (!parsed.ok) {
      continue;
    }
    const declaredPaths = getDeclaredBundlePaths(parsed.manifest);
    if (declaredPaths.size === 0) {
      continue;
    }
    const resolved = resolvePluginBundlePaths(manifestPath, [...declaredPaths]);
    for (const resolvedPath of resolved.values()) {
      const bundleBytes = allEntries.get(resolvedPath);
      if (bundleBytes) {
        files.set(resolvedPath, bundleBytes);
        ignored.delete(resolvedPath);
      }
    }
  }

  const finalIgnored = new Set<string>();
  for (const path of allEntries.keys()) {
    if (!files.has(path)) {
      finalIgnored.add(path);
    }
  }

  return { snapshot: { files }, ignored: [...finalIgnored] };
}
