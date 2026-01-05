import type { DatasetSnapshot } from './snapshotTypes';
import { exportDatasetSnapshotToZipBytes } from './zipSnapshot';
export function exportDatasetZipBytes(snapshot: DatasetSnapshot): Uint8Array {
  return exportDatasetSnapshotToZipBytes(snapshot);
}
