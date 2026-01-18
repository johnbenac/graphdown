import { readZipSnapshotFromBytes } from "@graphdown/io-zip";
import type { ImportResult } from "@graphdown/io";

export async function readZipSnapshot(file: File): Promise<ImportResult> {
  const buffer = await file.arrayBuffer();
  return readZipSnapshotFromBytes(new Uint8Array(buffer));
}
