import fs from 'node:fs';
import path from 'node:path';

export interface RepoSnapshot {
  files: Map<string, Uint8Array>;
}

function toPosixPath(filePath: string): string {
  return filePath.split(path.sep).join('/');
}

export function loadRepoSnapshotFromFs(root: string): RepoSnapshot {
  const files = new Map<string, Uint8Array>();

  const walk = (dir: string) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === '.git') {
        continue;
      }
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        const relPath = toPosixPath(path.relative(root, fullPath));
        const contents = fs.readFileSync(fullPath);
        files.set(relPath, contents);
      }
    }
  };

  walk(root);
  return { files };
}

export function getTextFile(snapshot: RepoSnapshot, relPath: string): string {
  const contents = snapshot.files.get(relPath);
  if (!contents) {
    throw new Error(`Missing file ${relPath}`);
  }
  return Buffer.from(contents).toString('utf8');
}
