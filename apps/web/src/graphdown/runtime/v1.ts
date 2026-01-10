import type { DatasetSnapshot } from '../model/snapshotTypes';
import type { ValidationError } from '../validate/errors';

export const RUNTIME_API_VERSION_V1 = 1 as const;

export type RuntimeCapabilityV1 = 'gd.api.read';

export interface RuntimeApiV1 {
  apiVersion: 1;
  capabilities: readonly RuntimeCapabilityV1[];
}

export type RuntimeApiResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: ValidationError[] };

export async function openRuntimeApiV1(input: {
  snapshot: DatasetSnapshot;
}): Promise<RuntimeApiResult<RuntimeApiV1>> {
  void input;
  return {
    ok: true,
    value: {
      apiVersion: 1,
      capabilities: ['gd.api.read']
    }
  };
}
