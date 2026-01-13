import {
  isRecordFileBytes,
  isPluginManifestCandidateBytes,
  parsePluginManifest,
  resolvePluginBundlePaths,
  type DatasetSnapshot
} from "@graphdown/core";
import type { ImportProgress } from "../types";
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

function isMarkdownFile(path: string): boolean {
  return path.toLowerCase().endsWith(".md");
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

  const treePaths = new Set<string>();
  const stage1Files: Array<{
    repoPath: string;
    snapshotPath: string;
    kind: "block" | "markdown";
  }> = [];
  const ignored = new Set<string>();

  for (const entry of treeResponse.tree) {
    if (entry.type !== "blob") {
      continue;
    }
    const snapshotPath = entry.path;
    if (!snapshotPath) {
      continue;
    }
    treePaths.add(snapshotPath);
    if (snapshotPath.startsWith("blocks/")) {
      stage1Files.push({ repoPath: entry.path, snapshotPath, kind: "block" });
      continue;
    }
    if (isMarkdownFile(snapshotPath)) {
      // Might be Graphdown markdown; decide after download via isRecordFileBytes.
      stage1Files.push({ repoPath: entry.path, snapshotPath, kind: "markdown" });
      continue;
    }
    ignored.add(snapshotPath);
  }
  const downloaded = new Map<string, Uint8Array>();
  const files = new Map<string, Uint8Array>();
  const manifestPaths: string[] = [];

  onProgress?.({ phase: "downloading_files", completed: 0, total: stage1Files.length });

  let completed = 0;
  for (const file of stage1Files) {
    const response = await fetch(`${RAW_BASE}/${owner}/${repo}/${resolvedRef}/${file.repoPath}`);
    if (!response.ok) {
      const message = await readResponseMessage(response);
      throw new GitHubImportError(mapGitHubError(response, message));
    }
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    downloaded.set(file.snapshotPath, bytes);
    if (file.kind === "block") {
      files.set(file.snapshotPath, bytes);
    } else {
      const isRecord = isRecordFileBytes(file.snapshotPath, bytes);
      const isManifest = isPluginManifestCandidateBytes(file.snapshotPath, bytes);
      if (isRecord || isManifest) {
        files.set(file.snapshotPath, bytes);
        if (isManifest) {
          manifestPaths.push(file.snapshotPath);
        }
      } else {
        ignored.add(file.snapshotPath);
      }
    }
    completed += 1;
    onProgress?.({
      phase: "downloading_files",
      completed,
      total: stage1Files.length,
      detail: file.snapshotPath
    });
  }

  const requiredBundlePaths = new Set<string>();
  const decoder = new TextDecoder("utf-8");
  for (const manifestPath of manifestPaths) {
    const manifestBytes = files.get(manifestPath) ?? downloaded.get(manifestPath);
    if (!manifestBytes) {
      continue;
    }
    let text: string;
    try {
      text = decoder.decode(manifestBytes);
    } catch {
      continue;
    }
    const parsed = parsePluginManifest(text, manifestPath);
    if (!parsed.ok) {
      continue;
    }
    const declaredRelativePaths = new Set<string>();
    const entry = parsed.manifest.yaml.entry;
    if (typeof entry === "string") {
      declaredRelativePaths.add(entry);
    }
    const manifestFiles = parsed.manifest.yaml.files;
    if (Array.isArray(manifestFiles)) {
      for (const file of manifestFiles) {
        if (typeof file === "string") {
          declaredRelativePaths.add(file);
        }
      }
    }
    const resolved = resolvePluginBundlePaths(manifestPath, [...declaredRelativePaths]);
    for (const resolvedPath of resolved.values()) {
      requiredBundlePaths.add(resolvedPath);
    }
  }

  const stage2FetchList: string[] = [];
  for (const bundleSnapshotPath of requiredBundlePaths) {
    if (files.has(bundleSnapshotPath)) {
      continue;
    }
    const downloadedBytes = downloaded.get(bundleSnapshotPath);
    if (downloadedBytes) {
      files.set(bundleSnapshotPath, downloadedBytes);
      ignored.delete(bundleSnapshotPath);
      continue;
    }
    if (treePaths.has(bundleSnapshotPath)) {
      stage2FetchList.push(bundleSnapshotPath);
    }
  }

  if (stage2FetchList.length > 0) {
    onProgress?.({
      phase: "downloading_files",
      completed,
      total: stage1Files.length + stage2FetchList.length
    });
  }

  for (const path of stage2FetchList) {
    const response = await fetch(`${RAW_BASE}/${owner}/${repo}/${resolvedRef}/${path}`);
    if (!response.ok) {
      const message = await readResponseMessage(response);
      throw new GitHubImportError(mapGitHubError(response, message));
    }
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    files.set(path, bytes);
    ignored.delete(path);
    completed += 1;
    onProgress?.({
      phase: "downloading_files",
      completed,
      total: stage1Files.length + stage2FetchList.length,
      detail: path
    });
  }

  return { snapshot: { files }, ignored: [...ignored] };
}
