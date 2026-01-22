import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { DatasetSnapshot } from "../model/snapshotTypes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function toPosixPath(filePath: string): string {
  return filePath.split(path.sep).join("/");
}

function collectFiles(root: string): string[] {
  const files: string[] = [];

  const walk = (dir: string): void => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        const relPath = toPosixPath(path.relative(root, fullPath));
        files.push(relPath);
      }
    }
  };

  walk(root);
  return files.sort();
}

export function loadFixtureSnapshot(fixtureName: string): DatasetSnapshot {
  const root = path.resolve(__dirname, "..", "__fixtures__", fixtureName);
  const files = new Map<string, Uint8Array>();
  const paths = collectFiles(root);

  for (const relPath of paths) {
    const fullPath = path.join(root, relPath);
    const contents = fs.readFileSync(fullPath);
    files.set(relPath, new Uint8Array(contents));
  }

  return { files };
}
