import { unzipSync } from "fflate";
import {
  isRecordFileBytes,
  parsePluginManifest,
  resolvePluginBundlePaths,
  type DatasetSnapshot,
  type ParsedPluginManifest
} from "@graphdown/core";

import { normalizeZipEntryPath } from "../zip/zipPath";

const ROOT_DIRS = new Set(["types", "records", "blocks", "plugins"]);

const textDecoder = new TextDecoder("utf-8", { fatal: true });

function extractFrontMatterText(markdown: string): string | null {
  const normalized = markdown.replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n");
  if (lines.length === 0 || lines[0].trim() !== "---") {
    return null;
  }
  let endIndex = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i].trim() === "---") {
      endIndex = i;
      break;
    }
  }
  const yamlLines = endIndex === -1 ? lines.slice(1) : lines.slice(1, endIndex);
  return yamlLines.join("\n");
}

function hasFrontMatterKey(frontMatter: string, key: string): boolean {
  const pattern = new RegExp(`^\\s*${key}\\s*:`, "m");
  return pattern.test(frontMatter);
}

function looksLikePluginManifest(frontMatter: string): boolean {
  const hasPluginId = hasFrontMatterKey(frontMatter, "pluginId");
  const hasApiVersion = hasFrontMatterKey(frontMatter, "gdApiVersion");
  const hasTypeId = hasFrontMatterKey(frontMatter, "typeId");
  return (hasPluginId || hasApiVersion) && !hasTypeId;
}

function normalizeEntries(entries: Record<string, Uint8Array>): Array<{ path: string; contents: Uint8Array }> {
  const seenPaths = new Set<string>();
  const normalizedEntries: Array<{ path: string; contents: Uint8Array }> = [];
  const sortedEntries = Object.entries(entries).sort(([a], [b]) => a.localeCompare(b));

  for (const [entryPath, contents] of sortedEntries) {
    const normalized = normalizeZipEntryPath(entryPath);
    if (seenPaths.has(normalized.path)) {
      throw new Error(`Zip entry path collision: ${normalized.path}`);
    }
    seenPaths.add(normalized.path);
    if (normalized.isDir) {
      continue;
    }
    normalizedEntries.push({ path: normalized.path, contents });
  }

  return normalizedEntries;
}

function shouldStripSingleRoot(entries: Array<{ path: string }>): { strip: boolean; root?: string } {
  const roots = new Set(entries.map((entry) => entry.path.split("/")[0]));
  if (roots.size !== 1) {
    return { strip: false };
  }
  const [root] = roots;
  if (!root || ROOT_DIRS.has(root)) {
    return { strip: false };
  }
  const allShareRoot = entries.every((entry) => entry.path.startsWith(`${root}/`));
  if (!allShareRoot) {
    return { strip: false };
  }
  return { strip: true, root };
}

function buildAllEntries(
  entries: Array<{ path: string; contents: Uint8Array }>,
  rootToStrip?: string
): Map<string, Uint8Array> {
  const allEntries = new Map<string, Uint8Array>();
  for (const entry of entries) {
    const finalPath = rootToStrip ? entry.path.split("/").slice(1).join("/") : entry.path;
    if (!finalPath) {
      throw new Error(`Invalid zip entry path after root stripping: ${entry.path}`);
    }
    if (allEntries.has(finalPath)) {
      throw new Error(`Zip entry path collision: ${finalPath}`);
    }
    allEntries.set(finalPath, entry.contents);
  }
  return allEntries;
}

function getDeclaredBundlePaths(manifest: ParsedPluginManifest): string[] {
  const declared = new Set<string>();
  const entry = manifest.yaml.entry;
  if (entry !== undefined && typeof entry !== "string") {
    throw new Error(`Plugin manifest ${manifest.file} entry must be a string`);
  }
  if (typeof entry === "string") {
    declared.add(entry);
  }

  const files = manifest.yaml.files;
  if (files !== undefined) {
    if (!Array.isArray(files) || files.some((file) => typeof file !== "string")) {
      throw new Error(`Plugin manifest ${manifest.file} files must be a list of strings`);
    }
    for (const file of files) {
      declared.add(file);
    }
  }

  const binaryFiles = manifest.yaml.binaryFiles;
  if (binaryFiles !== undefined) {
    if (!Array.isArray(binaryFiles) || binaryFiles.some((file) => typeof file !== "string")) {
      throw new Error(`Plugin manifest ${manifest.file} binaryFiles must be a list of strings`);
    }
    for (const file of binaryFiles) {
      declared.add(file);
    }
  }

  return [...declared].sort((a, b) => a.localeCompare(b));
}

export function readZipSnapshotFromBytes(
  zipBytes: Uint8Array
): { snapshot: DatasetSnapshot; ignored: string[] } {
  const entries = unzipSync(zipBytes);
  const normalizedEntries = normalizeEntries(entries);

  const { strip, root } = shouldStripSingleRoot(normalizedEntries);
  const allEntries = buildAllEntries(normalizedEntries, strip ? root : undefined);

  const files = new Map<string, Uint8Array>();
  const pluginManifestPaths: string[] = [];
  const pluginManifests = new Map<string, ParsedPluginManifest>();

  const entryPaths = [...allEntries.keys()].sort((a, b) => a.localeCompare(b));
  for (const path of entryPaths) {
    const contents = allEntries.get(path);
    if (!contents) {
      continue;
    }
    if (path.startsWith("blocks/")) {
      files.set(path, contents);
      continue;
    }
    if (!isRecordFileBytes(path, contents)) {
      continue;
    }

    let text = "";
    try {
      text = textDecoder.decode(contents);
    } catch {
      files.set(path, contents);
      continue;
    }

    const frontMatter = extractFrontMatterText(text);
    if (frontMatter && looksLikePluginManifest(frontMatter)) {
      const parsed = parsePluginManifest(text, path);
      if (!parsed.ok) {
        throw new Error(`Plugin manifest ${path} failed to parse: ${parsed.error.message}`);
      }
      const yaml = parsed.manifest.yaml;
      const hasPluginId = Object.prototype.hasOwnProperty.call(yaml, "pluginId");
      const hasApiVersion = Object.prototype.hasOwnProperty.call(yaml, "gdApiVersion");
      const hasTypeId = Object.prototype.hasOwnProperty.call(yaml, "typeId");
      if (hasPluginId && hasApiVersion && !hasTypeId) {
        files.set(path, contents);
        pluginManifestPaths.push(path);
        pluginManifests.set(path, parsed.manifest);
        continue;
      }
    }

    files.set(path, contents);
  }

  pluginManifestPaths.sort((a, b) => a.localeCompare(b));

  const missingBundlePaths = new Set<string>();
  for (const manifestPath of pluginManifestPaths) {
    const manifest = pluginManifests.get(manifestPath);
    if (!manifest) {
      throw new Error(`Plugin manifest ${manifestPath} was not loaded`);
    }

    const declaredPaths = getDeclaredBundlePaths(manifest);
    if (declaredPaths.length === 0) {
      continue;
    }

    const resolved = resolvePluginBundlePaths(manifestPath, declaredPaths);
    for (const declaredPath of declaredPaths) {
      const resolvedPath = resolved.get(declaredPath);
      if (typeof resolvedPath !== "string") {
        throw new Error(`Plugin manifest ${manifestPath} could not resolve ${declaredPath}`);
      }
      const bundleBytes = allEntries.get(resolvedPath);
      if (!bundleBytes) {
        missingBundlePaths.add(resolvedPath);
        continue;
      }
      files.set(resolvedPath, bundleBytes);
    }
  }

  if (missingBundlePaths.size > 0) {
    const sortedMissing = [...missingBundlePaths].sort((a, b) => a.localeCompare(b));
    throw new Error(`Missing plugin bundle files: ${sortedMissing.join(", ")}`);
  }

  const ignored = entryPaths.filter((path) => !files.has(path)).sort((a, b) => a.localeCompare(b));

  return { snapshot: { files }, ignored };
}
