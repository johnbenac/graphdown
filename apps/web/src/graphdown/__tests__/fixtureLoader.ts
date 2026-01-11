import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { DatasetSnapshot } from "..";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function toPosixPath(p: string): string {
  return p.split(path.sep).join("/");
}

function collectFilePaths(root: string): string[] {
  const files: string[] = [];

  const walk = (dir: string): void => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  };

  walk(root);
  return files;
}

export function loadFixtureSnapshot(fixtureName: string): DatasetSnapshot {
  const root = path.resolve(__dirname, "..", "__fixtures__", fixtureName);
  const files = new Map<string, Uint8Array>();

  const sortedPaths = collectFilePaths(root)
    .map((fullPath) => ({
      fullPath,
      relPath: toPosixPath(path.relative(root, fullPath)),
    }))
    .sort((a, b) => a.relPath.localeCompare(b.relPath));

  for (const { fullPath, relPath } of sortedPaths) {
    const contents = fs.readFileSync(fullPath);
    files.set(relPath, Uint8Array.from(contents));
  }

  return { files };
}
