import type { DatasetSnapshot } from "../../model/snapshotTypes";

const encoder = new TextEncoder();

export function utf8(text: string): Uint8Array {
  return encoder.encode(text);
}

export function makeSnapshot(files: Record<string, string | Uint8Array> = {}): DatasetSnapshot {
  const entries = Object.entries(files).map(([path, content]) => [path, typeof content === "string" ? utf8(content) : content] as const);
  return {
    files: new Map(entries)
  };
}
