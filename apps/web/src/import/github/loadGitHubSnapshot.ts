import { parseGraphdownFile } from "../../core/datasetObjects";
import type { DatasetSnapshot } from "../../core/snapshotTypes";
import {
  dirname,
  isUiConfigCandidate,
  isUiPluginManifestCandidate,
  isUnderDir,
  parseUiPluginManifest,
  selectUiConfigPathFromPaths
} from "../../core/uiPluginArtifacts";
import type { ImportProgress } from "../../state/DatasetContext";
import { GitHubImportError, mapGitHubError } from "./mapGitHubError";
import { computeIgnoredPaths } from "../computeIgnoredPaths";

const API_BASE = "https://api.github.com";
const RAW_BASE = "https://raw.githubusercontent.com";

type GitHubRepoMetadata = {
  default_branch?: string;
};

type GitHubTreeEntry = {
  path: string;
  type: "blob" | "tree" | "commit";
};

type GitHubTreeResponse = {
  tree: GitHubTreeEntry[];
};

async function readResponseMessage(response: Response): Promise<string | null> {
  try {
    const data = await response.json();
    if (data && typeof data.message === "string") {
      return data.message;
    }
  } catch {
    return null;
  }
  return null;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Accept: "application/vnd.github+json" }
  });
  if (!response.ok) {
    const message = await readResponseMessage(response);
    throw new GitHubImportError(mapGitHubError(response, message));
  }
  return response.json() as Promise<T>;
}

export async function loadGitHubSnapshot(input: {
  owner: string;
  repo: string;
  ref?: string;
  onProgress?: (progress: ImportProgress) => void;
}): Promise<{ snapshot: DatasetSnapshot; ignored: string[] }> {
  const { owner, repo, ref, onProgress } = input;

  onProgress?.({ phase: "fetching_repo" });
  const repoMetadata = await fetchJson<GitHubRepoMetadata>(`${API_BASE}/repos/${owner}/${repo}`);
  const resolvedRef = ref ?? repoMetadata.default_branch ?? "main";

  onProgress?.({ phase: "listing_files" });
  const treeResponse = await fetchJson<GitHubTreeResponse>(
    `${API_BASE}/repos/${owner}/${repo}/git/trees/${resolvedRef}?recursive=1`
  );

  const allBlobPaths: string[] = [];
  const blobStorePaths: string[] = [];
  const manifestCandidatePaths: string[] = [];
  const configCandidatePaths: string[] = [];

  for (const entry of treeResponse.tree) {
    if (entry.type !== "blob") continue;
    const snapshotPath = entry.path;
    if (!snapshotPath) continue;
    allBlobPaths.push(snapshotPath);
    const lower = snapshotPath.toLowerCase();
    if (snapshotPath.startsWith("blobs/sha256/")) {
      blobStorePaths.push(snapshotPath);
      continue;
    }
    if (isUiPluginManifestCandidate(snapshotPath)) {
      manifestCandidatePaths.push(snapshotPath);
      continue;
    }
    if (isUiConfigCandidate(snapshotPath)) {
      configCandidatePaths.push(snapshotPath);
      continue;
    }
    if (lower.endsWith(".md")) continue;
  }

  const downloadedBytesByPath = new Map<string, Uint8Array>();
  const pluginRootsById = new Map<string, string>();

  const downloadFile = async (path: string): Promise<Uint8Array> => {
    const response = await fetch(`${RAW_BASE}/${owner}/${repo}/${resolvedRef}/${path}`);
    if (!response.ok) {
      const message = await readResponseMessage(response);
      throw new GitHubImportError(mapGitHubError(response, message));
    }
    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  };

  // Phase 2: fetch manifests first
  manifestCandidatePaths.sort((a, b) => a.localeCompare(b));
  for (const path of manifestCandidatePaths) {
    const bytes = await downloadFile(path);
    downloadedBytesByPath.set(path, bytes);
    const parsed = parseUiPluginManifest(bytes);
    if (!parsed) continue;
    if (pluginRootsById.has(parsed.id)) continue;
    const rootDir = dirname(path);
    if (!rootDir) continue;
    pluginRootsById.set(parsed.id, rootDir);
  }

  const pluginRoots = [...pluginRootsById.values()];

  const configPath = selectUiConfigPathFromPaths(configCandidatePaths);
  const pathsToDownload = new Set<string>();
  blobStorePaths.forEach((p) => pathsToDownload.add(p));
  if (configPath) pathsToDownload.add(configPath);
  for (const path of allBlobPaths) {
    const lower = path.toLowerCase();
    const underPluginRoot = pluginRoots.some((root) => isUnderDir(path, root));
    if (underPluginRoot) {
      pathsToDownload.add(path);
      continue;
    }
    if (lower.endsWith(".md")) {
      pathsToDownload.add(path);
    }
  }

  const downloadQueue = [...pathsToDownload].sort((a, b) => a.localeCompare(b));

  onProgress?.({ phase: "downloading_files", completed: 0, total: downloadQueue.length });

  let completed = 0;
  for (const path of downloadQueue) {
    if (!downloadedBytesByPath.has(path)) {
      const bytes = await downloadFile(path);
      downloadedBytesByPath.set(path, bytes);
    }
    completed += 1;
    onProgress?.({
      phase: "downloading_files",
      completed,
      total: downloadQueue.length,
      detail: path
    });
  }

  // Apply inclusion rules
  const finalFiles = new Map<string, Uint8Array>();
  for (const [path, bytes] of downloadedBytesByPath.entries()) {
    const lower = path.toLowerCase();
    if (path.startsWith("blobs/sha256/")) {
      finalFiles.set(path, bytes);
      continue;
    }
    if (configPath && path === configPath) {
      finalFiles.set(path, bytes);
      continue;
    }
    if (pluginRoots.some((root) => isUnderDir(path, root))) {
      finalFiles.set(path, bytes);
      continue;
    }
    if (lower.endsWith(".md")) {
      const parsed = parseGraphdownFile(path, bytes);
      if (parsed.kind === "type" || parsed.kind === "record" || parsed.kind === "error") {
        finalFiles.set(path, bytes);
        continue;
      }
    }
  }

  const ignored = computeIgnoredPaths(allBlobPaths, finalFiles.keys());

  return { snapshot: { files: finalFiles }, ignored };
}
