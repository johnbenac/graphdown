import type { DatasetSnapshot } from "@graphdown/core";
import { buildZipBytesFromSnapshot } from "./zipSnapshot";

export function buildDatasetZipBytes(snapshot: DatasetSnapshot): Uint8Array {
  return buildZipBytesFromSnapshot(snapshot);
}
