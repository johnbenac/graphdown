import type { DatasetSnapshot } from '../../model/snapshotTypes';

export function utf8(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

export function makeSnapshot(files: Record<string, string | Uint8Array> = {}): DatasetSnapshot {
  return {
    files: new Map(
      Object.entries(files).map(([path, content]) => [path, typeof content === 'string' ? utf8(content) : content])
    )
  };
}
