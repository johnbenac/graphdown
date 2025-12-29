import { makeError } from "../../../../../src/core/errors";
import type { RepoSnapshot } from "../../../../../src/core/snapshotTypes";
import type { ImportProgress } from "../../state/DatasetContext";
import { mapGitHubError } from "./mapGitHubError";

type GitHubEntry = {
  type: "file" | "dir";
  name: string;
  path: string;
  download_url: string | null;
  url: string;
};

type GitHubRepoResponse = {
  default_branch: string;
};

type GitHubErrorBody = {
  message?: string;
};

type LoadSnapshotInput = {
  owner: string;
  repo: string;
  ref?: string;
  onProgress?: (progress: ImportProgress) => void;
};

const DATASET_DIRS = ["datasets", "types", "records"] as const;

async function readJson(response: Response): Promise<GitHubErrorBody | undefined> {
  try {
    return (await response.json()) as GitHubErrorBody;
  } catch {
    return undefined;
  }
}

async function fetchJson<T>(url: string): Promise<{ data: T; response: Response }> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json"
    }
  });
  if (!response.ok) {
    const payload = await readJson(response);
    const errorState = mapGitHubError({
      status: response.status,
      headers: response.headers,
      message: payload?.message
    });
    throw errorState;
  }
  const data = (await response.json()) as T;
  return { data, response };
}

async function fetchRaw(url: string): Promise<Uint8Array> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github.raw"
    }
  });
  if (!response.ok) {
    const payload = await readJson(response);
    const errorState = mapGitHubError({
      status: response.status,
      headers: response.headers,
      message: payload?.message
    });
    throw errorState;
  }
  return new Uint8Array(await response.arrayBuffer());
}

async function listContents(
  owner: string,
  repo: string,
  path: string,
  ref: string
): Promise<GitHubEntry[]> {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${encodeURIComponent(ref)}`;
  const { data } = await fetchJson<GitHubEntry[]>(url);
  return data;
}

function isImportErrorState(value: unknown): value is { category: string } {
  return !!value && typeof value === "object" && "category" in value;
}

async function listMarkdownFilesRecursively(
  owner: string,
  repo: string,
  path: string,
  ref: string,
  recursive: boolean
): Promise<Array<{ path: string; downloadUrl: string }>> {
  const entries = await listContents(owner, repo, path, ref);
  const results: Array<{ path: string; downloadUrl: string }> = [];

  for (const entry of entries) {
    if (entry.type === "file") {
      if (entry.path.toLowerCase().endsWith(".md") && entry.download_url) {
        results.push({ path: entry.path, downloadUrl: entry.download_url });
      }
      continue;
    }
    if (entry.type === "dir" && recursive) {
      const children = await listMarkdownFilesRecursively(owner, repo, entry.path, ref, true);
      results.push(...children);
    }
  }

  return results;
}

export async function loadGitHubSnapshot(input: LoadSnapshotInput): Promise<RepoSnapshot> {
  const { owner, repo, ref: refOverride, onProgress } = input;

  onProgress?.({ phase: "fetching_repo" });
  let repoMeta: GitHubRepoResponse;
  try {
    const { data } = await fetchJson<GitHubRepoResponse>(
      `https://api.github.com/repos/${owner}/${repo}`
    );
    repoMeta = data;
  } catch (error) {
    throw error;
  }

  const ref = refOverride ?? repoMeta.default_branch;

  onProgress?.({ phase: "listing_files" });
  const dirEntries = await Promise.all(
    DATASET_DIRS.map(async (dir) => {
      try {
        await listContents(owner, repo, dir, ref);
        return { dir, ok: true };
      } catch (error) {
        if (isImportErrorState(error) && error.category === "not_found") {
          return { dir, ok: false };
        }
        throw error;
      }
    })
  );

  const missingDirs = dirEntries.filter((entry) => !entry.ok).map((entry) => entry.dir);
  if (missingDirs.length > 0) {
    throw {
      category: "dataset_invalid",
      title: "Dataset missing required directories",
      message: `Missing required directories: ${missingDirs.join(", ")}`,
      errors: missingDirs.map((dir) =>
        makeError("E_DIR_MISSING", `Missing required ${dir}/ directory`)
      )
    };
  }

  const datasetFiles = await listMarkdownFilesRecursively(owner, repo, "datasets", ref, false);
  const typeFiles = await listMarkdownFilesRecursively(owner, repo, "types", ref, true);
  const recordFiles = await listMarkdownFilesRecursively(owner, repo, "records", ref, true);
  const allFiles = [...datasetFiles, ...typeFiles, ...recordFiles];

  onProgress?.({ phase: "downloading_files", completed: 0, total: allFiles.length });
  const files = new Map<string, Uint8Array>();
  let completed = 0;
  for (const file of allFiles) {
    const contents = await fetchRaw(file.downloadUrl);
    files.set(file.path, contents);
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
