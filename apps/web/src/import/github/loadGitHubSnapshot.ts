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

function normalizeSubdir(subdir?: string): string | undefined {
  if (!subdir) {
    return undefined;
  }
  const cleaned = subdir.replace(/^\/+|\/+$/g, "");
  return cleaned ? cleaned : undefined;
}

function matchesDatasetPath(path: string): boolean {
  return (
    path.startsWith("datasets/") ||
    path.startsWith("types/") ||
    path.startsWith("records/")
  );
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
  const treeResponse = await fetchJson<GitHubTreeResponse>(
    `${API_BASE}/repos/${owner}/${repo}/git/trees/${encodeURIComponent(resolvedRef)}?recursive=1`
  );

  const normalizedSubdir = normalizeSubdir(subdir);
  const allFiles = treeResponse.tree
    .filter((entry) => entry.type === "blob" && entry.path.toLowerCase().endsWith(".md"))
    .map((entry) => {
      const isWithinSubdir = normalizedSubdir
        ? entry.path.startsWith(`${normalizedSubdir}/`)
        : true;
      if (!isWithinSubdir) {
        return null;
      }
      const relativePath = normalizedSubdir
        ? entry.path.slice(normalizedSubdir.length + 1)
        : entry.path;
      if (!matchesDatasetPath(relativePath)) {
        return null;
      }
      return {
        path: relativePath,
        rawPath: entry.path
      };
    })
    .filter(
      (entry): entry is { path: string; rawPath: string } => Boolean(entry)
    );
  const files = new Map<string, Uint8Array>();

  onProgress?.({ phase: "downloading_files", completed: 0, total: allFiles.length });

  let completed = 0;
  for (const file of allFiles) {
    const response = await fetch(
      `${RAW_BASE}/${owner}/${repo}/${resolvedRef}/${file.rawPath}`
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
