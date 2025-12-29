import type { RepoSnapshot } from "../../../../../src/core/snapshotTypes";
import type { ImportProgress } from "../../state/DatasetContext";
import { GitHubImportError, mapGitHubError } from "./mapGitHubError";

const API_BASE = "https://api.github.com";

type GitHubContentItem = {
  type: "file" | "dir";
  path: string;
  name: string;
  download_url: string | null;
};

type GitHubRepoMetadata = {
  default_branch: string;
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

async function listDirectory(path: string, ref: string): Promise<GitHubContentItem[]> {
  const url = new URL(`${API_BASE}/repos/${path}`);
  url.searchParams.set("ref", ref);

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/vnd.github+json" }
  });

  if (response.status === 404) {
    return [];
  }

  if (!response.ok) {
    const message = await readResponseMessage(response);
    throw new GitHubImportError(mapGitHubError(response, message));
  }

  const data = await response.json();
  if (Array.isArray(data)) {
    return data as GitHubContentItem[];
  }
  return [];
}

async function listMarkdownFilesRecursively(
  owner: string,
  repo: string,
  path: string,
  ref: string
): Promise<Array<{ path: string; downloadUrl: string }>> {
  const items = await listDirectory(`${owner}/${repo}/contents/${path}`, ref);
  const results: Array<{ path: string; downloadUrl: string }> = [];

  for (const item of items) {
    if (item.type === "dir") {
      results.push(...(await listMarkdownFilesRecursively(owner, repo, item.path, ref)));
      continue;
    }
    if (item.type === "file" && item.name.toLowerCase().endsWith(".md") && item.download_url) {
      results.push({ path: item.path, downloadUrl: item.download_url });
    }
  }

  return results;
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
  const datasetItems = await listDirectory(`${owner}/${repo}/contents/datasets`, resolvedRef);
  const datasetFiles = datasetItems
    .filter((item) => item.type === "file" && item.name.toLowerCase().endsWith(".md") && item.download_url)
    .map((item) => ({ path: item.path, downloadUrl: item.download_url! }));

  const typeFiles = await listMarkdownFilesRecursively(owner, repo, "types", resolvedRef);
  const recordFiles = await listMarkdownFilesRecursively(owner, repo, "records", resolvedRef);

  const allFiles = [...datasetFiles, ...typeFiles, ...recordFiles];
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
