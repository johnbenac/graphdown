import { unzipSync } from "fflate";
import { parseGraphdownFile } from "../core/datasetObjects";
import type { DatasetSnapshot } from "../core/snapshotTypes";
import { computeIgnoredPaths } from "./computeIgnoredPaths";
import {
  discoverUiPluginPackages,
  isUiConfigCandidate,
  isUnderDir,
  selectUiConfigPath
} from "../core/uiPluginArtifacts";

const ROOT_DIRS = new Set(["types", "records", "plugins", "blobs"]);

function normalizeZipPath(path: string): string | null {
  if (path.includes("\0")) {
    return null;
  }
  let normalized = path.replace(/\\/g, "/");
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
  const finalEntries: Array<{ path: string; contents: Uint8Array }> = [];
  for (const entry of normalizedEntries) {
    const finalPath = shouldStripRoot ? entry.path.split("/").slice(1).join("/") : entry.path;
    if (!finalPath) continue;
    finalEntries.push({ path: finalPath, contents: entry.contents });
  }

  const fileMap = new Map<string, Uint8Array>(finalEntries.map((entry) => [entry.path, entry.contents]));
  const packages = discoverUiPluginPackages(fileMap);
  const pluginDirs = packages.map((pkg) => pkg.rootDir);
  const configPath = selectUiConfigPath(fileMap);

  const files = new Map<string, Uint8Array>();
  const sourcePaths = finalEntries.map((entry) => entry.path);

  for (const entry of finalEntries) {
    const { path, contents } = entry;
    const lower = path.toLowerCase();

    if (path.startsWith("blobs/sha256/")) {
      files.set(path, contents);
      continue;
    }

    if (configPath && path === configPath) {
      files.set(path, contents);
      continue;
    }

    if (pluginDirs.some((dir) => isUnderDir(path, dir))) {
      files.set(path, contents);
      continue;
    }

    if (lower.endsWith(".md")) {
      const parsed = parseGraphdownFile(path, contents);
      if (parsed.kind === "type" || parsed.kind === "record" || parsed.kind === "error") {
        files.set(path, contents);
        continue;
      }
    }
  }

  const ignored = computeIgnoredPaths(sourcePaths, files.keys());

  return { snapshot: { files }, ignored };
}
