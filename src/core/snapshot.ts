import fs from 'node:fs';
import path from 'node:path';

export interface RepoSnapshot {
  files: Map<string, Uint8Array>;
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
        continue;
      }
      if (entry.isFile()) {
        const relPath = path.relative(root, fullPath).split(path.sep).join('/');
        files.set(relPath, fs.readFileSync(fullPath));
      }
    }
  };

  walk(root);

  return { files };
}

export function getTextFile(snapshot: RepoSnapshot, relPath: string): string {
  const data = snapshot.files.get(relPath);
  if (!data) {
    throw new Error(`Missing file: ${relPath}`);
  }
  return new TextDecoder('utf-8').decode(data);
}
