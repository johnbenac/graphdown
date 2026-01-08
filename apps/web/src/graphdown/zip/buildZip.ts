import type { DatasetSnapshot } from '../model/snapshotTypes';
import { buildZipBytesFromSnapshot } from './zipSnapshot';

export function buildDatasetZipBytes(snapshot: DatasetSnapshot): Uint8Array {
  return buildZipBytesFromSnapshot(snapshot);
}
