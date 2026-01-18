import { selectSemanticSnapshotFiles } from "@graphdown/io";
import type { ImportProgress, ImportResult } from "@graphdown/io";
import { ImportError } from "@graphdown/io";
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
    const data = (await response.json()) as { message?: unknown } | null;
    if (data && typeof data.message === "string") {
      return data.message;
    }
  } catch {
    return null;
  }
  return null;
}

async function fetchJson<T>(
  url: string,
  fetchFn: typeof fetch,
  signal?: AbortSignal
): Promise<T> {
  const response = await fetchFn(url, {
    headers: { Accept: "application/vnd.github+json" },
    signal
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
  fetch?: typeof fetch;
  signal?: AbortSignal;
}): Promise<ImportResult> {
  const { owner, repo, ref, onProgress, signal } = input;
  const fetchFn = input.fetch ?? fetch;

  onProgress?.({ phase: "fetching_repo" });
  const repoMetadata = await fetchJson<GitHubRepoMetadata>(
    `${API_BASE}/repos/${owner}/${repo}`,
    fetchFn,
    signal
  );
  const resolvedRef = ref ?? repoMetadata.default_branch ?? "main";

  onProgress?.({ phase: "listing_files" });
  const treeResponse = await fetchJson<GitHubTreeResponse>(
    `${API_BASE}/repos/${owner}/${repo}/git/trees/${resolvedRef}?recursive=1`,
    fetchFn,
    signal
  );

  const treePaths = new Set<string>();
  const stage1Files: Array<{
    repoPath: string;
    snapshotPath: string;
    kind: "block" | "markdown";
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
      stage1Files.push({ repoPath: entry.path, snapshotPath, kind: "block" });
      continue;
    }
    if (isMarkdownFile(snapshotPath)) {
      // Might be Graphdown markdown; decide after download via isRecordFileBytes.
      stage1Files.push({ repoPath: entry.path, snapshotPath, kind: "markdown" });
      continue;
    }
    ignored.add(snapshotPath);
  }
  const entries = new Map<string, Uint8Array>();

  let total = stage1Files.length;
  onProgress?.({ phase: "downloading_files", completed: 0, total });

  let completed = 0;
  for (const file of stage1Files) {
    const response = await fetchFn(
      `${RAW_BASE}/${owner}/${repo}/${resolvedRef}/${file.repoPath}`,
      { signal }
    );
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

  let pass1;
  try {
    pass1 = selectSemanticSnapshotFiles(entries);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new ImportError({ source: "github", code: "invalid_input", message });
  }
  for (const path of pass1.ignored) {
    ignored.add(path);
  }

  const stage2FetchList: string[] = [];
  const missingInTree: string[] = [];
  for (const bundlePath of pass1.missingPluginBundlePaths) {
    if (treePaths.has(bundlePath)) {
      stage2FetchList.push(bundlePath);
    } else {
      missingInTree.push(bundlePath);
    }
  }

  if (missingInTree.length > 0) {
    throw new ImportError({
      source: "github",
      code: "missing_files",
      message: `Missing plugin bundle files: ${missingInTree.join(", ")}`,
      missingPaths: missingInTree
    });
  }

  if (stage2FetchList.length > 0) {
    total += stage2FetchList.length;
    onProgress?.({ phase: "downloading_files", completed, total });
  }

  for (const bundlePath of stage2FetchList) {
    const response = await fetchFn(
      `${RAW_BASE}/${owner}/${repo}/${resolvedRef}/${bundlePath}`,
      { signal }
    );
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

  let pass2;
  try {
    pass2 = selectSemanticSnapshotFiles(entries);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new ImportError({ source: "github", code: "invalid_input", message });
  }
  if (pass2.missingPluginBundlePaths.length > 0) {
    throw new ImportError({
      source: "github",
      code: "missing_files",
      message: `Missing plugin bundle files: ${pass2.missingPluginBundlePaths.join(", ")}`,
      missingPaths: pass2.missingPluginBundlePaths
    });
  }

  for (const path of pass2.ignored) {
    ignored.add(path);
  }
  for (const path of pass2.snapshot.files.keys()) {
    ignored.delete(path);
  }

  return { snapshot: pass2.snapshot, ignored: [...ignored].sort((a, b) => a.localeCompare(b)) };
}
