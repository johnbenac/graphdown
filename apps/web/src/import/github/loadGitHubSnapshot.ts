import type { RepoSnapshot } from "../../../../src/core/snapshotTypes";
import type { ImportProgress } from "../../state/importTypes";

export type GitHubSnapshotInput = {
  owner: string;
  repo: string;
  ref?: string;
  onProgress?: (progress: ImportProgress) => void;
};

type GitHubApiErrorStage = "repo" | "contents" | "download";

export class GitHubApiError extends Error {
  status: number;
  headers: Headers;
  stage: GitHubApiErrorStage;

  constructor(message: string, options: { status: number; headers: Headers; stage: GitHubApiErrorStage }) {
    super(message);
    this.status = options.status;
    this.headers = options.headers;
    this.stage = options.stage;
  }
}

type GitHubContentEntry = {
  type: "file" | "dir";
  name: string;
  path: string;
  download_url?: string | null;
};

type GitHubRepo = {
  default_branch: string;
};

const GITHUB_API = "https://api.github.com";

async function fetchJson(url: string, stage: GitHubApiErrorStage) {
  const response = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
  if (!response.ok) {
    let message: string | undefined;
    try {
      const data = await response.json();
      if (data && typeof data.message === "string") {
        message = data.message;
      }
    } catch {
      message = undefined;
    }
    throw new GitHubApiError(message ?? `GitHub request failed (${response.status}).`, {
      status: response.status,
      headers: response.headers,
      stage
    });
  }
  return response.json();
}

async function fetchText(url: string, stage: GitHubApiErrorStage) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new GitHubApiError(`GitHub file download failed (${response.status}).`, {
      status: response.status,
      headers: response.headers,
      stage
    });
  }
  return response.text();
}

async function fetchContents(owner: string, repo: string, path: string, ref: string | undefined) {
  const url = new URL(`${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`);
  if (ref) {
    url.searchParams.set("ref", ref);
  }
  return fetchJson(url.toString(), "contents") as Promise<GitHubContentEntry[] | GitHubContentEntry>;
}

async function listMarkdownFilesRecursively(
  owner: string,
  repo: string,
  path: string,
  ref: string | undefined
): Promise<Array<{ path: string; downloadUrl: string }>> {
  let entries: GitHubContentEntry[] | GitHubContentEntry;
  try {
    entries = await fetchContents(owner, repo, path, ref);
  } catch (error) {
    if (error instanceof GitHubApiError && error.status === 404) {
      return [];
    }
    throw error;
  }

  if (!Array.isArray(entries)) {
    if (entries.type === "file") {
      if (entries.path.toLowerCase().endsWith(".md") && entries.download_url) {
        return [{ path: entries.path, downloadUrl: entries.download_url }];
      }
    }
    return [];
  }

  const results: Array<{ path: string; downloadUrl: string }> = [];
  for (const entry of entries) {
    if (entry.type === "dir") {
      const children = await listMarkdownFilesRecursively(owner, repo, entry.path, ref);
      results.push(...children);
    } else if (entry.type === "file") {
      if (entry.path.toLowerCase().endsWith(".md") && entry.download_url) {
        results.push({ path: entry.path, downloadUrl: entry.download_url });
      }
    }
  }
  return results;
}

async function listDatasetMarkdownFiles(
  owner: string,
  repo: string,
  path: string,
  ref: string | undefined
): Promise<Array<{ path: string; downloadUrl: string }>> {
  let entries: GitHubContentEntry[] | GitHubContentEntry;
  try {
    entries = await fetchContents(owner, repo, path, ref);
  } catch (error) {
    if (error instanceof GitHubApiError && error.status === 404) {
      return [];
    }
    throw error;
  }

  if (!Array.isArray(entries)) {
    if (entries.type === "file") {
      if (entries.path.toLowerCase().endsWith(".md") && entries.download_url) {
        return [{ path: entries.path, downloadUrl: entries.download_url }];
      }
    }
    return [];
  }

  return entries
    .filter((entry) => entry.type === "file")
    .filter((entry) => entry.path.toLowerCase().endsWith(".md"))
    .map((entry) => ({ path: entry.path, downloadUrl: entry.download_url ?? "" }))
    .filter((entry) => Boolean(entry.downloadUrl));
}

export async function loadGitHubSnapshot(input: GitHubSnapshotInput): Promise<RepoSnapshot> {
  input.onProgress?.({ phase: "fetching_repo" });
  const repoData = (await fetchJson(
    `${GITHUB_API}/repos/${input.owner}/${input.repo}`,
    "repo"
  )) as GitHubRepo;

  const ref = input.ref ?? repoData.default_branch;

  input.onProgress?.({ phase: "listing_files" });
  const datasetFiles = await listDatasetMarkdownFiles(input.owner, input.repo, "datasets", ref);
  const typeFiles = await listMarkdownFilesRecursively(input.owner, input.repo, "types", ref);
  const recordFiles = await listMarkdownFilesRecursively(input.owner, input.repo, "records", ref);

  const filesToDownload = [...datasetFiles, ...typeFiles, ...recordFiles];
  const files = new Map<string, Uint8Array>();

  const total = filesToDownload.length;
  let completed = 0;

  input.onProgress?.({ phase: "downloading_files", completed, total });

  for (const file of filesToDownload) {
    const text = await fetchText(file.downloadUrl, "download");
    files.set(file.path, new TextEncoder().encode(text));
    completed += 1;
    input.onProgress?.({
      phase: "downloading_files",
      completed,
      total,
      detail: file.path
    });
  }

  return { files };
}
