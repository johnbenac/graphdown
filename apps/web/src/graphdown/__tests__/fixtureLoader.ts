import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { DatasetSnapshot } from "..";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function toPosixPath(inputPath: string): string {
  return inputPath.split(path.sep).join("/");
}

function collectFiles(rootDir: string, currentDir: string, entries: string[]): void {
  const dirEntries = fs.readdirSync(currentDir, { withFileTypes: true });
  for (const entry of dirEntries) {
    if (entry.name === ".git") {
      continue;
    }
    const fullPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(rootDir, fullPath, entries);
    } else if (entry.isFile()) {
      entries.push(fullPath);
    }
  }
}

export function loadFixtureSnapshot(fixtureName: string): DatasetSnapshot {
  const fixtureRoot = path.resolve(__dirname, "..", "__fixtures__", fixtureName);
  const files = new Map<string, Uint8Array>();
  const collected: string[] = [];

  collectFiles(fixtureRoot, fixtureRoot, collected);

  const sortedPaths = collected
    .map((fullPath) => toPosixPath(path.relative(fixtureRoot, fullPath)))
    .sort((a, b) => a.localeCompare(b));

  for (const relPath of sortedPaths) {
    const fullPath = path.join(fixtureRoot, relPath.split("/").join(path.sep));
    const contents = new Uint8Array(fs.readFileSync(fullPath));
    files.set(relPath, contents);
  }

  return { files };
}
