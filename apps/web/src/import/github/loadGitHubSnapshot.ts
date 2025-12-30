import type { RepoSnapshot } from "../../../../../src/core/snapshotTypes";
import type { ImportProgress } from "../../state/DatasetContext";
import { GitHubImportError, mapGitHubError } from "./mapGitHubError";

const API_BASE = "https://api.github.com";
const RAW_BASE = "https://raw.githubusercontent.com";

type GitHubTreeItem = {
  path: string;
  type: "blob" | "tree" | "commit";
};

type GitHubTreeResponse = {
  tree: GitHubTreeItem[];
};

type GitHubRepoMetadata = {
  default_branch: string;
};

type GitHubFile = {
  path: string;
  repoPath: string;
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

function normalizeSubdir(subdir?: string): string | null {
  if (!subdir) {
    return null;
  }
  const trimmed = subdir.replace(/^\/+|\/+$/g, "");
  return trimmed ? trimmed : null;
}

function getSnapshotPath(path: string, subdir: string | null): string | null {
  if (!subdir) {
    return path;
  }
  const prefix = `${subdir}/`;
  if (!path.startsWith(prefix)) {
    return null;
  }
  return path.slice(prefix.length);
}

function isDatasetPath(path: string): boolean {
  return path.startsWith("datasets/") || path.startsWith("types/") || path.startsWith("records/");
}

function listMarkdownFiles(
  tree: GitHubTreeItem[],
  subdir: string | null
): GitHubFile[] {
  const results: GitHubFile[] = [];
  for (const item of tree) {
    if (item.type !== "blob") {
      continue;
    }
    if (!item.path.toLowerCase().endsWith(".md")) {
      continue;
    }
    const snapshotPath = getSnapshotPath(item.path, subdir);
    if (!snapshotPath || !isDatasetPath(snapshotPath)) {
      continue;
    }
    results.push({ path: snapshotPath, repoPath: item.path });
  }
  return results;
}

export async function loadGitHubSnapshot(input: {
  owner: string;
  repo: string;
  ref?: string;
  subdir?: string;
  onProgress?: (progress: ImportProgress) => void;
}): Promise<RepoSnapshot> {
  const { owner, repo, ref, subdir, onProgress } = input;

  onProgress?.({ phase: "fetching_repo" });
  const repoMetadata = await fetchJson<GitHubRepoMetadata>(`${API_BASE}/repos/${owner}/${repo}`);
  const resolvedRef = ref ?? repoMetadata.default_branch;
  const normalizedSubdir = normalizeSubdir(subdir);

  onProgress?.({ phase: "listing_files" });
  const treeResponse = await fetchJson<GitHubTreeResponse>(
    `${API_BASE}/repos/${owner}/${repo}/git/trees/${resolvedRef}?recursive=1`
  );
  const allFiles = listMarkdownFiles(treeResponse.tree ?? [], normalizedSubdir);
  const files = new Map<string, Uint8Array>();

  onProgress?.({ phase: "downloading_files", completed: 0, total: allFiles.length });

  let completed = 0;
  for (const file of allFiles) {
    const response = await fetch(
      `${RAW_BASE}/${owner}/${repo}/${resolvedRef}/${file.repoPath}`
    );
    if (!response.ok) {
      const message = await readResponseMessage(response);
      throw new GitHubImportError(mapGitHubError(response, message));
    }
    const buffer = await response.arrayBuffer();
    files.set(file.path, new Uint8Array(buffer));
    completed += 1;
    onProgress?.({
      phase: "downloading_files",
      completed,
      total: allFiles.length,
      detail: file.path
    });
  }

  return { files };
}
