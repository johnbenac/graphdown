import type { RepoSnapshot } from "../../../../../src/core/snapshotTypes";
import type { ImportProgress } from "../../state/DatasetContext";
import { GitHubImportError, mapGitHubError } from "./mapGitHubError";

const API_BASE = "https://api.github.com";

type GitHubRepoMetadata = {
  default_branch: string;
};

type GitHubTreeItem = {
  path: string;
  type: "blob" | "tree";
};

type GitHubTreeResponse = {
  tree: GitHubTreeItem[];
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

const ALLOWED_ROOTS = ["datasets/", "types/", "records/"];

function isAllowedPath(path: string): boolean {
  if (!path.toLowerCase().endsWith(".md")) {
    return false;
  }
  return ALLOWED_ROOTS.some((root) => path.startsWith(root));
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

  onProgress?.({ phase: "listing_files" });
  const tree = await fetchJson<GitHubTreeResponse>(
    `${API_BASE}/repos/${owner}/${repo}/git/trees/${resolvedRef}?recursive=1`
  );

  const prefix = subdir ? `${subdir.replace(/^\/+|\/+$/g, "")}/` : "";
  const allFiles = tree.tree
    .filter((item) => item.type === "blob")
    .map((item) => item.path)
    .filter((path) => (prefix ? path.startsWith(prefix) : true))
    .map((path) => (prefix ? path.slice(prefix.length) : path))
    .filter((path) => isAllowedPath(path))
    .map((path) => ({
      path,
      downloadUrl: `https://raw.githubusercontent.com/${owner}/${repo}/${resolvedRef}/${prefix}${path}`
    }));
  const files = new Map<string, Uint8Array>();

  onProgress?.({ phase: "downloading_files", completed: 0, total: allFiles.length });

  let completed = 0;
  for (const file of allFiles) {
    const response = await fetch(file.downloadUrl);
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
