import type { DatasetSnapshot } from "@graphdown/dataset";
import { buildZipBytesFromSnapshot } from "./zipSnapshot";

export function buildDatasetZipBytes(snapshot: DatasetSnapshot): Uint8Array {
  return buildZipBytesFromSnapshot(snapshot);
}
