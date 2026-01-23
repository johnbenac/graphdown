import type { DatasetSnapshot } from "@graphmd/dataset";
import { buildZipBytesFromSnapshot } from "./zipSnapshot";

export function buildDatasetZipBytes(snapshot: DatasetSnapshot): Uint8Array {
  return buildZipBytesFromSnapshot(snapshot);
}
