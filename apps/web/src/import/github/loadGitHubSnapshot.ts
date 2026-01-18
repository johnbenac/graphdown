import type { DatasetSnapshot } from "@graphdown/core";
import { selectSemanticSnapshotFiles } from "@graphdown/io";
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
      stage1Files.push({ repoPath: entry.path, snapshotPath });
      continue;
    }
    if (isMarkdownFile(snapshotPath)) {
      // Might be Graphdown markdown; decide after download via isRecordFileBytes.
      stage1Files.push({ repoPath: entry.path, snapshotPath });
      continue;
    }
    ignored.add(snapshotPath);
  }
  const entries = new Map<string, Uint8Array>();

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
    entries.set(file.snapshotPath, bytes);

    completed += 1;
    onProgress?.({
      phase: "downloading_files",
      completed,
      total,
      detail: file.snapshotPath
    });
  }

  const pass1 = selectSemanticSnapshotFiles(entries);
  for (const ignoredPath of pass1.ignored) {
    ignored.add(ignoredPath);
  }

  const missingInTree = pass1.missingPluginBundlePaths.filter(
    (bundlePath) => !treePaths.has(bundlePath)
  );
  if (missingInTree.length > 0) {
    throw new Error(`Missing plugin bundle files: ${missingInTree.join(", ")}`);
  }

  const stage2FetchList = pass1.missingPluginBundlePaths.filter((bundlePath) =>
    treePaths.has(bundlePath)
  );
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
    entries.set(bundlePath, new Uint8Array(buffer));
    ignored.delete(bundlePath);
    completed += 1;
    onProgress?.({
      phase: "downloading_files",
      completed,
      total,
      detail: bundlePath
    });
  }

  const pass2 = selectSemanticSnapshotFiles(entries);
  if (pass2.missingPluginBundlePaths.length > 0) {
    throw new Error(
      `Missing plugin bundle files: ${pass2.missingPluginBundlePaths.join(", ")}`
    );
  }

  for (const ignoredPath of pass2.ignored) {
    ignored.add(ignoredPath);
  }

  return {
    snapshot: pass2.snapshot,
    ignored: [...ignored].sort((a, b) => a.localeCompare(b))
  };
}
