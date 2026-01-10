import type { DatasetSnapshot } from '../../model/snapshotTypes';

const encoder = new TextEncoder();

export function utf8(text: string): Uint8Array {
  return encoder.encode(text);
}

export function makeSnapshot(files: Record<string, string | Uint8Array> = {}): DatasetSnapshot {
  const entries: Array<[string, Uint8Array]> = Object.entries(files).map(([path, contents]) => [
    path,
    typeof contents === 'string' ? utf8(contents) : contents
  ]);

  return {
    files: new Map<string, Uint8Array>(entries)
  };
}
