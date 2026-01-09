import type { DatasetSnapshot } from "../../graphdown";
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

function isTypeFile(path: string): boolean {
  return path.startsWith("types/");
}

function isRecordFile(path: string): boolean {
  return path.startsWith("records/");
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

  const allFiles: Array<{ repoPath: string; snapshotPath: string }> = [];
  const ignored: string[] = [];

  for (const entry of treeResponse.tree) {
    if (entry.type !== "blob") {
      continue;
    }
    const snapshotPath = entry.path;
    if (!snapshotPath) {
      continue;
    }
    if (isTypeFile(snapshotPath) && isMarkdownFile(snapshotPath)) {
      allFiles.push({ repoPath: entry.path, snapshotPath });
      continue;
    }
    if (isRecordFile(snapshotPath) && isMarkdownFile(snapshotPath)) {
      allFiles.push({ repoPath: entry.path, snapshotPath });
      continue;
    }
    if (snapshotPath.startsWith("blocks/")) {
      allFiles.push({ repoPath: entry.path, snapshotPath });
      continue;
    }
    if (snapshotPath.startsWith("blobs/sha256/")) {
      allFiles.push({ repoPath: entry.path, snapshotPath });
      continue;
    }
    ignored.push(snapshotPath);
  }
  const files = new Map<string, Uint8Array>();

  onProgress?.({ phase: "downloading_files", completed: 0, total: allFiles.length });

  let completed = 0;
  for (const file of allFiles) {
    const response = await fetch(`${RAW_BASE}/${owner}/${repo}/${resolvedRef}/${file.repoPath}`);
    if (!response.ok) {
      const message = await readResponseMessage(response);
      throw new GitHubImportError(mapGitHubError(response, message));
    }
    const buffer = await response.arrayBuffer();
    files.set(file.snapshotPath, new Uint8Array(buffer));
    completed += 1;
    onProgress?.({
      phase: "downloading_files",
      completed,
      total: allFiles.length,
      detail: file.snapshotPath
    });
  }

  return { snapshot: { files }, ignored };
}
