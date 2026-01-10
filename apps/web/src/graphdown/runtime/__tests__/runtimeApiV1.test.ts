import assert from 'node:assert/strict';
import { test } from 'vitest';

import { openRuntimeApiV1, RUNTIME_API_VERSION_V1 } from '../../index';
import { makeSnapshot } from './fixtures';

test('runtime API v1 exports from index', () => {
  assert.equal(RUNTIME_API_VERSION_V1, 1);
});

test('runtime API v1 open returns ok and metadata', async () => {
  const result = await openRuntimeApiV1({ snapshot: makeSnapshot() });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.apiVersion, 1);
    assert.ok(result.value.capabilities.includes('gd.api.read'));
  }
});

test('runtime API v1 open is async', () => {
  const promise = openRuntimeApiV1({ snapshot: makeSnapshot() });
  assert.equal(typeof (promise as Promise<unknown>).then, 'function');
});
