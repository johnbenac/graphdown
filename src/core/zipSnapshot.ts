import fs from 'node:fs';

import { unzipSync, zipSync } from 'fflate';

import { RepoSnapshot } from './snapshot';

export interface ExportZipOptions {
  include?: (path: string) => boolean;
  excludeGit?: boolean;
}

function normalizeZipPath(filePath: string): string | null {
  let normalized = filePath.replace(/\\/g, '/');
  while (normalized.startsWith('./')) {
    normalized = normalized.slice(2);
  }
  if (normalized.endsWith('/')) {
    return null;
  }
  if (!normalized) {
    throw new Error('Invalid zip entry path');
  }
  if (normalized.includes('\0')) {
    throw new Error('Invalid zip entry path');
  }
  if (normalized.startsWith('/')) {
    throw new Error('Invalid zip entry path');
  }
  const segments = normalized.split('/');
  if (segments.some((segment) => segment === '..' || segment.length === 0)) {
    throw new Error('Invalid zip entry path');
  }
  return normalized;
}

export function loadRepoSnapshotFromZipBytes(zipBytes: Uint8Array): RepoSnapshot {
  const files = new Map<string, Uint8Array>();
  const entries = unzipSync(zipBytes);

  for (const [filePath, contents] of Object.entries(entries)) {
    const normalized = normalizeZipPath(filePath);
    if (!normalized) {
      continue;
    }
    files.set(normalized, contents);
  }

  return { files };
}

export function loadRepoSnapshotFromZipFile(zipPath: string): RepoSnapshot {
  const contents = fs.readFileSync(zipPath);
  return loadRepoSnapshotFromZipBytes(contents);
}

export function exportRepoSnapshotToZipBytes(snapshot: RepoSnapshot, options?: ExportZipOptions): Uint8Array {
  const entries: Record<string, Uint8Array> = {};
  const sortedPaths = [...snapshot.files.keys()].sort((a, b) => a.localeCompare(b));
  const excludeGit = options?.excludeGit ?? true;

  for (const filePath of sortedPaths) {
    if (excludeGit && (filePath === '.git' || filePath.startsWith('.git/'))) {
      continue;
    }
    if (options?.include && !options.include(filePath)) {
      continue;
    }
    const contents = snapshot.files.get(filePath);
    if (!contents) {
      continue;
    }
    entries[filePath] = contents;
  }

  return zipSync(entries, { level: 0 });
}
