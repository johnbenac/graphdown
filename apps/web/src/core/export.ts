import { canonicalizeDatasetSnapshot } from './canonicalizeDatasetSnapshot';
import type { DatasetSnapshot } from './snapshotTypes';
import { exportDatasetSnapshotToZipBytes } from './zipSnapshot';

export function exportDatasetOnlyZip(snapshot: DatasetSnapshot): Uint8Array {
  const canonical = canonicalizeDatasetSnapshot(snapshot);
  return exportDatasetSnapshotToZipBytes(canonical);
}

export function exportWholeDatasetZip(snapshot: DatasetSnapshot): Uint8Array {
  return exportDatasetSnapshotToZipBytes(snapshot);
}
