import { unzipSync } from "fflate";
import type { RepoSnapshot } from "@graphdown/core";

export function loadRepoSnapshotFromZip(bytes: Uint8Array): RepoSnapshot {
  const entries = unzipSync(bytes);
  const files = new Map<string, Uint8Array>();

  for (const [path, contents] of Object.entries(entries)) {
    if (path.endsWith("/")) {
      continue;
    }
    files.set(path, contents);
  }

  return { files };
}
