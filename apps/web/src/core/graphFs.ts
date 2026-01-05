import { buildGraphFromSnapshot } from './graph';
import { loadRepoSnapshotFromFs } from './snapshot';
import type { BuildGraphResult } from './graph';

export function buildGraphFromFs(rootDir: string): BuildGraphResult {
  const snapshot = loadRepoSnapshotFromFs(rootDir);
  return buildGraphFromSnapshot(snapshot);
}
