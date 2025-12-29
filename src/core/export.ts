import { RepoSnapshot } from './snapshot';
import { exportRepoSnapshotToZipBytes } from './zipSnapshot';

function isRecordMarkdownPath(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  if (!lower.endsWith('.md')) {
    return false;
  }
  return (
    filePath.startsWith('datasets/') ||
    filePath.startsWith('types/') ||
    filePath.startsWith('records/')
  );
}

export function exportDatasetOnlyZip(snapshot: RepoSnapshot): Uint8Array {
  return exportRepoSnapshotToZipBytes(snapshot, {
    include: isRecordMarkdownPath
  });
}

export function exportWholeRepoZip(snapshot: RepoSnapshot): Uint8Array {
  return exportRepoSnapshotToZipBytes(snapshot);
}
