import { RepoSnapshot } from './snapshot';
import { exportRepoSnapshotToZipBytes } from './zipSnapshot';

export function exportDatasetOnlyZip(snapshot: RepoSnapshot): Uint8Array {
  return exportRepoSnapshotToZipBytes(snapshot, {
    include: (filePath) => {
      const lower = filePath.toLowerCase();
      if (!lower.endsWith('.md')) {
        return false;
      }
      return (
        filePath.startsWith('datasets/') ||
        filePath.startsWith('types/') ||
        filePath.startsWith('records/')
      );
    },
  });
}

export function exportWholeRepoZip(snapshot: RepoSnapshot): Uint8Array {
  return exportRepoSnapshotToZipBytes(snapshot);
}
