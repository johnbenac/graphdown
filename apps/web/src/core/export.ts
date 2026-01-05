import type { DatasetSnapshot } from "./snapshotTypes";
import { exportRepoSnapshotToZipBytes } from "./zipSnapshot";

export function exportDatasetZipBytes(snapshot: DatasetSnapshot): Uint8Array {
  return exportRepoSnapshotToZipBytes(snapshot);
}
