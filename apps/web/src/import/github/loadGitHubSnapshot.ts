import type { RepoSnapshot } from "../../../../../src/core/snapshotTypes";
import type { ImportProgress } from "../../state/importTypes";

type GitHubContentsEntry = {
  type: "file" | "dir";
  name: string;
  path: string;
  download_url: string | null;
};

export class GitHubApiError extends Error {
  status: number;
  headers: Headers;
  message: string;

  constructor(status: number, headers: Headers, message: string) {
    super(message);
    this.status = status;
    this.headers = headers;
    this.message = message;
  }
}

export class DatasetLayoutError extends Error {}

const API_ROOT = "https://api.github.com/repos";

function encodePath(path: string): string {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

async function parseJsonMessage(response: Response): Promise<string> {
  try {
    const payload = await response.json();
    if (payload && typeof payload === "object" && "message" in payload) {
      return String(payload.message);
    }
  } catch {
    // ignore parse failures
  }
  return response.statusText;
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: { Accept: "application/vnd.github+json" }
  });
  if (!response.ok) {
    const message = await parseJsonMessage(response);
    throw new GitHubApiError(response.status, response.headers, message);
  }
  return response.json();
}

async function fetchContents(
  owner: string,
  repo: string,
  path: string,
  ref?: string
): Promise<GitHubContentsEntry[] | "missing"> {
  const url = new URL(`${API_ROOT}/${owner}/${repo}/contents/${encodePath(path)}`);
  if (ref) {
    url.searchParams.set("ref", ref);
  }
  const response = await fetch(url.toString(), {
    headers: { Accept: "application/vnd.github+json" }
  });
  if (response.status === 404) {
    return "missing";
  }
  if (!response.ok) {
    const message = await parseJsonMessage(response);
    throw new GitHubApiError(response.status, response.headers, message);
  }
  const payload = (await response.json()) as unknown;
  if (!Array.isArray(payload)) {
    throw new DatasetLayoutError(`Expected ${path}/ to be a directory.`);
  }
  return payload as GitHubContentsEntry[];
}

async function listMarkdownFilesRecursively(
  owner: string,
  repo: string,
  path: string,
  ref?: string
): Promise<GitHubContentsEntry[]> {
  const entries = await fetchContents(owner, repo, path, ref);
  if (entries === "missing") {
    return [];
  }
  const results: GitHubContentsEntry[] = [];
  for (const entry of entries) {
    if (entry.type === "dir") {
      const nested = await listMarkdownFilesRecursively(owner, repo, entry.path, ref);
      results.push(...nested);
    } else if (entry.type === "file" && entry.name.toLowerCase().endsWith(".md")) {
      results.push(entry);
    }
  }
  return results;
}

async function downloadFile(entry: GitHubContentsEntry): Promise<Uint8Array> {
  if (!entry.download_url) {
    throw new DatasetLayoutError(`Missing download URL for ${entry.path}`);
  }
  const response = await fetch(entry.download_url);
  if (!response.ok) {
    throw new GitHubApiError(response.status, response.headers, response.statusText);
  }
  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}

export async function loadGitHubSnapshot(input: {
  owner: string;
  repo: string;
  ref?: string;
  onProgress?: (p: { phase: ImportProgress }) => void;
}): Promise<RepoSnapshot> {
  const { owner, repo } = input;
  input.onProgress?.({ phase: { phase: "fetching_repo" } });
  const metadata = (await fetchJson(`${API_ROOT}/${owner}/${repo}`)) as {
    default_branch?: string;
  };
  const ref = input.ref ?? metadata.default_branch;
  if (!ref) {
    throw new DatasetLayoutError("Unable to determine a branch for this repository.");
  }

  input.onProgress?.({ phase: { phase: "listing_files" } });
  const requiredDirs = ["datasets", "types", "records"] as const;
  const dirListings = await Promise.all(
    requiredDirs.map((dir) => fetchContents(owner, repo, dir, ref))
  );
  const missingDirs = requiredDirs.filter((_, index) => dirListings[index] === "missing");
  if (missingDirs.length > 0) {
    throw new DatasetLayoutError(`Missing required directories: ${missingDirs.join(", ")}`);
  }

  const datasetsListing = dirListings[0] as GitHubContentsEntry[];
  const datasetFiles = datasetsListing.filter(
    (entry) => entry.type === "file" && entry.name.toLowerCase().endsWith(".md")
  );
  const typeFiles = await listMarkdownFilesRecursively(owner, repo, "types", ref);
  const recordFiles = await listMarkdownFilesRecursively(owner, repo, "records", ref);

  const allFiles = [...datasetFiles, ...typeFiles, ...recordFiles];
  const total = allFiles.length;
  let completed = 0;
  const files = new Map<string, Uint8Array>();

  input.onProgress?.({
    phase: { phase: "downloading_files", completed, total }
  });

  for (const entry of allFiles) {
    const contents = await downloadFile(entry);
    files.set(entry.path, contents);
    completed += 1;
    input.onProgress?.({
      phase: { phase: "downloading_files", completed, total, detail: entry.path }
    });
  }

  return { files };
}
