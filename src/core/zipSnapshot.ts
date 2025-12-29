import fs from 'node:fs';
import { unzipSync, zipSync } from 'fflate';

import { RepoSnapshot } from './snapshot';

function normalizeZipPath(rawPath: string): string {
  let normalized = rawPath.replace(/\\/g, '/');
  while (normalized.startsWith('./')) {
    normalized = normalized.slice(2);
  }
  if (!normalized) {
    throw new Error(`Invalid zip entry path: ${rawPath}`);
  }
  if (normalized.includes('\0')) {
    throw new Error(`Invalid zip entry path: ${rawPath}`);
  }
  if (normalized.startsWith('/')) {
    throw new Error(`Invalid zip entry path: ${rawPath}`);
  }
  const segments = normalized.split('/');
  if (segments.some((segment) => segment === '..')) {
    throw new Error(`Invalid zip entry path: ${rawPath}`);
  }
  return normalized;
}

export function loadRepoSnapshotFromZipBytes(zipBytes: Uint8Array): RepoSnapshot {
  const entries = unzipSync(zipBytes);
  const files = new Map<string, Uint8Array>();

  for (const [rawPath, contents] of Object.entries(entries)) {
    const normalized = normalizeZipPath(rawPath);
    if (normalized.endsWith('/')) {
      continue;
    }
    files.set(normalized, contents);
  }

  return { files };
}

export function loadRepoSnapshotFromZipFile(zipPath: string): RepoSnapshot {
  const bytes = fs.readFileSync(zipPath);
  return loadRepoSnapshotFromZipBytes(bytes);
}

export interface ExportRepoSnapshotOptions {
  include?: (path: string) => boolean;
  excludeGit?: boolean;
}

export function exportRepoSnapshotToZipBytes(
  snapshot: RepoSnapshot,
  options: ExportRepoSnapshotOptions = {}
): Uint8Array {
  const { include, excludeGit = true } = options;
  const entries: Record<string, Uint8Array> = {};

  const paths = [...snapshot.files.keys()].sort((a, b) => a.localeCompare(b));
  for (const filePath of paths) {
    if (excludeGit && (filePath === '.git' || filePath.startsWith('.git/'))) {
      continue;
    }
    if (include && !include(filePath)) {
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
