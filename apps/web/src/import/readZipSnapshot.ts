import { readZipSnapshotFromBytes } from "@graphmd/io-zip";
import type { ImportResult } from "@graphmd/io";

export async function readZipSnapshot(
  file: File
): Promise<ImportResult> {
  const buffer = await file.arrayBuffer();
  return readZipSnapshotFromBytes(new Uint8Array(buffer));
}
