import fs from 'node:fs';
import { unzipSync, zipSync } from 'fflate';

import { RepoSnapshot } from './snapshot';

export interface ExportZipOptions {
  include?: (path: string) => boolean;
  excludeGit?: boolean;
}

function normalizeZipPath(rawPath: string): string {
  let normalized = rawPath.replace(/\\/g, '/');
  while (normalized.startsWith('./')) {
    normalized = normalized.slice(2);
  }
  if (normalized === '.') {
    normalized = '';
  }
  if (!normalized) {
    throw new Error(`Invalid zip entry path "${rawPath}"`);
  }
  if (normalized.includes('\0')) {
    throw new Error(`Invalid zip entry path "${rawPath}"`);
  }
  if (normalized.startsWith('/')) {
    throw new Error(`Invalid zip entry path "${rawPath}"`);
  }
  const segments = normalized.split('/');
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) {
    throw new Error(`Invalid zip entry path "${rawPath}"`);
  }
  return normalized;
}

export function loadRepoSnapshotFromZipBytes(zipBytes: Uint8Array): RepoSnapshot {
  const files = new Map<string, Uint8Array>();
  const entries = unzipSync(zipBytes);

  for (const [rawPath, contents] of Object.entries(entries)) {
    if (rawPath.endsWith('/')) {
      continue;
    }
    const normalized = normalizeZipPath(rawPath);
    files.set(normalized, contents);
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
  const entries: Record<string, Uint8Array> = {};
  const { include, excludeGit = true } = options;
  const paths = [...snapshot.files.keys()].sort((a, b) => a.localeCompare(b));

  for (const filePath of paths) {
    if (excludeGit && (filePath === '.git' || filePath.startsWith('.git/'))) {
      continue;
    }
    if (include && !include(filePath)) {
      continue;
    }
    const contents = snapshot.files.get(filePath);
    if (contents) {
      entries[filePath] = contents;
    }
  }

  return zipSync(entries, { level: 0 });
}
