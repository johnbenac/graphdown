import type { DatasetSnapshot } from '../../model/snapshotTypes';

export function utf8(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

export function makeSnapshot(files: Record<string, string | Uint8Array> = {}): DatasetSnapshot {
  return {
    files: new Map<string, Uint8Array>(
      Object.entries(files).map(([path, contents]) => [path, typeof contents === 'string' ? utf8(contents) : contents])
    )
  };
}
