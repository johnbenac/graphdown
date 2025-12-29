import fs from 'node:fs';
import path from 'node:path';

export interface RepoSnapshot {
  files: Map<string, Uint8Array>;
}

function toPosixPath(value: string): string {
  return value.split(path.sep).join('/');
}

export function loadRepoSnapshotFromFs(root: string): RepoSnapshot {
  const files = new Map<string, Uint8Array>();

  function walk(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name === '.git') {
        continue;
      }
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        const relPath = toPosixPath(path.relative(root, fullPath));
        files.set(relPath, fs.readFileSync(fullPath));
      }
    }
  }

  walk(root);

  return { files };
}

export function getTextFile(snapshot: RepoSnapshot, relPath: string): string {
  const data = snapshot.files.get(relPath);
  if (!data) {
    throw new Error(`File not found in snapshot: ${relPath}`);
  }
  return Buffer.from(data).toString('utf8');
}
