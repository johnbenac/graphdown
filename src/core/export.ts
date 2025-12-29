import { RepoSnapshot } from './snapshot';
import { exportRepoSnapshotToZipBytes } from './zipSnapshot';

const DATASET_PREFIXES = ['datasets/', 'types/', 'records/'];

function isDatasetRecordPath(filePath: string): boolean {
  const lowerPath = filePath.toLowerCase();
  if (!lowerPath.endsWith('.md')) {
    return false;
  }
  return DATASET_PREFIXES.some((prefix) => filePath.startsWith(prefix));
}

export function exportDatasetOnlyZip(snapshot: RepoSnapshot): Uint8Array {
  return exportRepoSnapshotToZipBytes(snapshot, {
    include: isDatasetRecordPath
  });
}

export function exportWholeRepoZip(snapshot: RepoSnapshot): Uint8Array {
  return exportRepoSnapshotToZipBytes(snapshot);
}
