import { RepoSnapshot } from './snapshot';
import { exportRepoSnapshotToZipBytes } from './zipSnapshot';

const DATASET_PREFIXES = ['datasets/', 'types/', 'records/'];

function isDatasetMarkdown(path: string): boolean {
  if (!path.toLowerCase().endsWith('.md')) {
    return false;
  }
  return DATASET_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export function exportDatasetOnlyZip(snapshot: RepoSnapshot): Uint8Array {
  return exportRepoSnapshotToZipBytes(snapshot, {
    include: isDatasetMarkdown,
  });
}

export function exportWholeRepoZip(snapshot: RepoSnapshot): Uint8Array {
  return exportRepoSnapshotToZipBytes(snapshot);
}
