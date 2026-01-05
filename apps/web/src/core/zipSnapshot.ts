import fs from 'node:fs';

import { unzipSync, zipSync } from 'fflate';

import { RepoSnapshot } from './snapshot';

export interface ExportZipOptions {
  include?: (path: string) => boolean;
  excludeGit?: boolean;
}

function normalizeZipPath(entryPath: string): string {
  let normalized = entryPath.replace(/\\/g, '/');
  while (normalized.startsWith('./')) {
    normalized = normalized.slice(2);
  }

  if (!normalized || normalized === '.') {
    throw new Error('Invalid zip entry path');
  }
  if (normalized.startsWith('/')) {
    throw new Error(`Invalid zip entry path: ${entryPath}`);
  }
  if (normalized.includes('\0')) {
    throw new Error(`Invalid zip entry path: ${entryPath}`);
  }

  const segments = normalized.split('/');
  if (segments.some((segment) => segment.length === 0)) {
    throw new Error(`Invalid zip entry path: ${entryPath}`);
  }
  if (segments.some((segment) => segment === '..')) {
    throw new Error(`Invalid zip entry path: ${entryPath}`);
  }

  return segments.join('/');
}

export function loadRepoSnapshotFromZipBytes(zipBytes: Uint8Array): RepoSnapshot {
  const entries = unzipSync(zipBytes);
  const files = new Map<string, Uint8Array>();

  for (const [entryPath, contents] of Object.entries(entries)) {
    const normalizedEntryPath = entryPath.replace(/\\/g, '/');
    if (normalizedEntryPath.endsWith('/')) {
      continue;
    }
    const normalizedPath = normalizeZipPath(normalizedEntryPath);
    files.set(normalizedPath, contents);
  }

  return { files };
}

export function loadRepoSnapshotFromZipFile(zipPath: string): RepoSnapshot {
  const zipBytes = fs.readFileSync(zipPath);
  return loadRepoSnapshotFromZipBytes(zipBytes);
}

export function exportRepoSnapshotToZipBytes(
  snapshot: RepoSnapshot,
  options: ExportZipOptions = {}
): Uint8Array {
  const include = options.include ?? (() => true);
  const excludeGit = options.excludeGit ?? true;
  const entries: Record<string, Uint8Array> = {};

  const paths = [...snapshot.files.keys()].sort((a, b) => a.localeCompare(b));
  for (const filePath of paths) {
    if (excludeGit && (filePath === '.git' || filePath.startsWith('.git/'))) {
      continue;
    }
    if (!include(filePath)) {
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
