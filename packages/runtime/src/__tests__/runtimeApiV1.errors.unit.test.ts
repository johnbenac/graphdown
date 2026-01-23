import assert from 'node:assert/strict';
import { test } from 'vitest';

import { blockPathForCid, cidFromRawBytes } from '@graphmd/dataset';
import { openRuntimeApiV1, isRuntimeApiError } from '../index';
import { utf8, validDatasetMinimal } from './fixtures';

test('API-ERR-001: getBlockBytes missing block rejects with structured error + file + hint', async () => {
  const opened = await openRuntimeApiV1({ snapshot: validDatasetMinimal() });
  assert.equal(opened.ok, true);
  if (!opened.ok) {
    assert.fail('Expected ok result');
  }

  const api = opened.value;
  const missingCid = cidFromRawBytes(utf8('definitely-not-present'));

  await assert.rejects(api.getBlockBytes(missingCid), (err: unknown) => {
    assert.ok(isRuntimeApiError(err));
    assert.equal(err.op, 'getBlockBytes');
    assert.equal(err.code, 'E_BLOCK_REFERENCE_MISSING');
    assert.ok(err.message.includes(missingCid));
    assert.equal(err.file, blockPathForCid(missingCid));
    assert.equal(typeof err.hint, 'string');
    assert.doesNotThrow(() => structuredClone(err));
    return true;
  });
});

test('API-ERR-001: invalid CID argument rejects with structured error', async () => {
  const opened = await openRuntimeApiV1({ snapshot: validDatasetMinimal() });
  assert.equal(opened.ok, true);
  if (!opened.ok) {
    assert.fail('Expected ok result');
  }

  await assert.rejects(opened.value.hasBlock('not-a-cid'), (err: unknown) => {
    assert.ok(isRuntimeApiError(err));
    assert.equal(err.op, 'hasBlock');
    assert.equal(err.code, 'E_CID_INVALID');
    assert.equal(typeof err.message, 'string');
    return true;
  });
});

test('API-ERR-001: open fails with structured error when structuredClone is unavailable', async () => {
  const original = (globalThis as { structuredClone?: unknown }).structuredClone;
  (globalThis as { structuredClone?: unknown }).structuredClone = undefined;
  try {
    const opened = await openRuntimeApiV1({ snapshot: validDatasetMinimal() });
    assert.equal(opened.ok, false);
    if (opened.ok) {
      assert.fail('Expected error result');
    }
    assert.ok(
      opened.errors.some(
        (error) => error.code === 'E_INTERNAL' && error.message.includes('structuredClone')
      )
    );
  } finally {
    (globalThis as { structuredClone?: unknown }).structuredClone = original;
  }
});
