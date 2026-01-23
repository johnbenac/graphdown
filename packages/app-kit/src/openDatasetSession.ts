import type { DatasetSnapshot, ValidationError } from "@graphmd/dataset";
import { validateDatasetSnapshot } from "@graphmd/dataset";
import type { RuntimeApiV1 } from "@graphmd/runtime";
import { openRuntimeApiV1 } from "@graphmd/runtime";
import { buildSnapshotIndex, type SnapshotIndex } from "./buildSnapshotIndex";

export type { SnapshotIndex };

export async function openDatasetSession(snapshot: DatasetSnapshot): Promise<
  | { ok: true; runtimeApiV1: RuntimeApiV1; index: SnapshotIndex }
  | { ok: false; errors: ValidationError[] }
> {
  const validation = validateDatasetSnapshot(snapshot);
  if (!validation.ok) {
    return { ok: false, errors: validation.errors };
  }

  const runtime = await openRuntimeApiV1({ snapshot });
  if (!runtime.ok) {
    return { ok: false, errors: runtime.errors };
  }

  const indexResult = buildSnapshotIndex(snapshot);
  if (!indexResult.ok) {
    return { ok: false, errors: indexResult.errors };
  }

  return { ok: true, runtimeApiV1: runtime.value, index: indexResult.index };
}
