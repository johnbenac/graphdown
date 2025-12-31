import type { RepoSnapshot } from "../../../../../src/core/snapshotTypes";
import type { ImportProgress } from "../../state/DatasetContext";
import { GitHubImportError, mapGitHubError } from "./mapGitHubError";

const API_BASE = "https://api.github.com";
const RAW_BASE = "https://raw.githubusercontent.com";

type GitHubRepoMetadata = {
  default_branch: string;
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

function isDatasetFile(path: string): boolean {
  if (!path.startsWith("datasets/")) {
    return false;
  }
  const rest = path.slice("datasets/".length);
  return rest.length > 0 && !rest.includes("/");
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
}): Promise<RepoSnapshot> {
  const { owner, repo, ref, onProgress } = input;

  onProgress?.({ phase: "fetching_repo" });
  const repoMetadata = await fetchJson<GitHubRepoMetadata>(`${API_BASE}/repos/${owner}/${repo}`);
  const resolvedRef = ref ?? repoMetadata.default_branch;

  onProgress?.({ phase: "listing_files" });
  const treeResponse = await fetchJson<GitHubTreeResponse>(
    `${API_BASE}/repos/${owner}/${repo}/git/trees/${resolvedRef}?recursive=1`
  );

  const allFiles: Array<{ repoPath: string; snapshotPath: string }> = [];

  for (const entry of treeResponse.tree) {
    if (entry.type !== "blob" || !isMarkdownFile(entry.path)) {
      continue;
    }
    const snapshotPath = entry.path;
    if (!snapshotPath) {
      continue;
    }
    if (!isDatasetFile(snapshotPath) && !isTypeFile(snapshotPath) && !isRecordFile(snapshotPath)) {
      continue;
    }
    allFiles.push({ repoPath: entry.path, snapshotPath });
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

  return { files };
}
