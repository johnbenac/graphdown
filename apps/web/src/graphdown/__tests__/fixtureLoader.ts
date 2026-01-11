import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { DatasetSnapshot } from "..";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function toPosixPath(filePath: string): string {
  return filePath.split(path.sep).join("/");
}

function walkFiles(root: string): string[] {
  const files: string[] = [];

  const walk = (dir: string): void => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === ".git") {
        continue;
      }
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
  const filePaths = walkFiles(root)
    .map((filePath) => toPosixPath(path.relative(root, filePath)))
    .sort((a, b) => a.localeCompare(b));

  for (const relPath of filePaths) {
    const fullPath = path.join(root, relPath);
    const contents = fs.readFileSync(fullPath);
    files.set(relPath, new Uint8Array(contents));
  }

  return { files };
}
