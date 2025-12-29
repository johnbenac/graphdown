import { unzipSync } from "fflate";
import type { RepoSnapshot } from "../../../../src/core/snapshotTypes";

export async function readZipSnapshot(file: File): Promise<RepoSnapshot> {
  const buffer = await file.arrayBuffer();
  const entries = unzipSync(new Uint8Array(buffer));
  const files = new Map<string, Uint8Array>();
  for (const [path, contents] of Object.entries(entries)) {
    if (path.endsWith("/")) {
      continue;
    }
    files.set(path, contents);
  }
  return { files };
}
