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
  const binaryFiles = manifest.yaml.binaryFiles;
  if (Array.isArray(binaryFiles)) {
    for (const file of binaryFiles) {
      if (typeof file === "string") {
        declared.add(file);
      }
    }
  }
  return declared;
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
  const files = new Map<string, Uint8Array>();
  const downloaded = new Map<string, Uint8Array>();
  const manifestPaths: string[] = [];

  let total = stage1Files.length;
  onProgress?.({ phase: "downloading_files", completed: 0, total });

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
      total,
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
      requiredBundlePaths.add(resolvedPath);
    }
  }

  const stage2FetchList: string[] = [];
  for (const bundlePath of requiredBundlePaths) {
    if (files.has(bundlePath)) {
      continue;
    }
    const downloadedBytes = downloaded.get(bundlePath);
    if (downloadedBytes) {
      files.set(bundlePath, downloadedBytes);
      ignored.delete(bundlePath);
      continue;
    }
    if (treePaths.has(bundlePath)) {
      stage2FetchList.push(bundlePath);
    }
  }

  if (stage2FetchList.length > 0) {
    total += stage2FetchList.length;
  }

  for (const bundlePath of stage2FetchList) {
    const response = await fetch(`${RAW_BASE}/${owner}/${repo}/${resolvedRef}/${bundlePath}`);
    if (!response.ok) {
      const message = await readResponseMessage(response);
      throw new GitHubImportError(mapGitHubError(response, message));
    }
    const buffer = await response.arrayBuffer();
    files.set(bundlePath, new Uint8Array(buffer));
    ignored.delete(bundlePath);
    completed += 1;
    onProgress?.({
      phase: "downloading_files",
      completed,
      total,
      detail: bundlePath
    });
  }

  return { snapshot: { files }, ignored: [...ignored] };
}
