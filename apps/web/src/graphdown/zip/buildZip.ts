import type { DatasetSnapshot } from '../model/snapshotTypes';
import { exportDatasetSnapshotToZipBytes } from './zipSnapshot';

export function buildDatasetZipBytes(snapshot: DatasetSnapshot): Uint8Array {
  return exportDatasetSnapshotToZipBytes(snapshot);
}
