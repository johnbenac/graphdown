import { readZipSnapshotFromBytes } from "@graphdown/io-zip";
import type { DatasetSnapshot } from "@graphdown/core";

export async function readZipSnapshot(
  file: File
): Promise<{ snapshot: DatasetSnapshot; ignored: string[] }> {
  const buffer = await file.arrayBuffer();
  return readZipSnapshotFromBytes(new Uint8Array(buffer));
}
