import { parseGraphdownFile } from "../../core/datasetObjects";
import type { DatasetSnapshot } from "../../core/snapshotTypes";
import {
  dirname,
  isUiConfigCandidate,
  isUiPluginManifestCandidate,
  isUnderDir,
  parseUiPluginManifest,
  selectUiConfigPath
} from "../../core/uiPluginArtifacts";
import type { ImportProgress } from "../../state/DatasetContext";
import { GitHubImportError, mapGitHubError } from "./mapGitHubError";

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

  const ignored: string[] = [];

  const blobCandidates: string[] = [];
  const manifestCandidates: string[] = [];
  const configCandidates: string[] = [];
  const mdCandidates: string[] = [];

  for (const entry of treeResponse.tree) {
    if (entry.type !== "blob") continue;
    const snapshotPath = entry.path;
    if (!snapshotPath) continue;
    const lower = snapshotPath.toLowerCase();
    if (snapshotPath.startsWith("blobs/sha256/")) {
      blobCandidates.push(snapshotPath);
      continue;
    }
    if (isUiPluginManifestCandidate(snapshotPath)) {
      manifestCandidates.push(snapshotPath);
      continue;
    }
    if (isUiConfigCandidate(snapshotPath)) {
      configCandidates.push(snapshotPath);
      continue;
    }
    if (lower.endsWith(".md")) {
      mdCandidates.push(snapshotPath);
      continue;
    }
  }

  const files = new Map<string, Uint8Array>();
  const manifestBytes = new Map<string, Uint8Array>();
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
  manifestCandidates.sort((a, b) => a.localeCompare(b));
  for (const path of manifestCandidates) {
    const bytes = await downloadFile(path);
    const parsed = parseUiPluginManifest(bytes);
    if (!parsed) {
      ignored.push(path);
      continue;
    }
    if (pluginRootsById.has(parsed.id)) {
      continue;
    }
    const rootDir = dirname(path);
    if (!rootDir) {
      ignored.push(path);
      continue;
    }
    pluginRootsById.set(parsed.id, rootDir);
    manifestBytes.set(path, bytes);
  }

  const pluginRoots = [...pluginRootsById.values()];

  const configPath = selectUiConfigPath(new Map(configCandidates.map((p) => [p, new Uint8Array()]))); // lex smallest
  for (const cfg of configCandidates) {
    if (!configPath || cfg !== configPath) {
      ignored.push(cfg);
    }
  }

  const pathsToDownload = new Set<string>();
  blobCandidates.forEach((p) => pathsToDownload.add(p));
  if (configPath) {
    pathsToDownload.add(configPath);
  }
  for (const root of pluginRoots) {
    for (const entry of treeResponse.tree) {
      if (entry.type !== "blob") continue;
      if (isUnderDir(entry.path, root)) {
        pathsToDownload.add(entry.path);
      }
    }
  }
  for (const mdPath of mdCandidates) {
    if (pluginRoots.some((root) => isUnderDir(mdPath, root))) {
      continue;
    }
    pathsToDownload.add(mdPath);
  }

  const manifestPaths = new Set(manifestBytes.keys());
  const downloadQueue = [...pathsToDownload].filter((p) => !manifestPaths.has(p)).sort((a, b) => a.localeCompare(b));

  onProgress?.({ phase: "downloading_files", completed: 0, total: downloadQueue.length + manifestBytes.size });

  let completed = 0;
  for (const path of downloadQueue) {
    const bytes = await downloadFile(path);
    files.set(path, bytes);
    completed += 1;
    onProgress?.({
      phase: "downloading_files",
      completed,
      total: downloadQueue.length + manifestBytes.size,
      detail: path
    });
  }

  // include manifest bytes (already downloaded)
  for (const [path, bytes] of manifestBytes.entries()) {
    files.set(path, bytes);
    completed += 1;
    onProgress?.({
      phase: "downloading_files",
      completed,
      total: downloadQueue.length + manifestBytes.size,
      detail: path
    });
  }

  // Apply inclusion rules
  const finalFiles = new Map<string, Uint8Array>();
  for (const [path, bytes] of files.entries()) {
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
    ignored.push(path);
  }

  return { snapshot: { files: finalFiles }, ignored };
}
