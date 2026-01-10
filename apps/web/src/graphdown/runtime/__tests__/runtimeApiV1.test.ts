import assert from 'node:assert/strict';
import { test } from 'vitest';

import { openRuntimeApiV1, RUNTIME_API_VERSION_V1, validateDatasetSnapshot } from '../../index';
import {
  invalidDataset_badBlockPathUnderBlocks,
  invalidDataset_missingFrontMatter,
  invalidDataset_missingTypeForRecord,
  invalidDataset_unknownTopLevelKey,
  recordFile,
  typeFile,
  validDatasetMinimal,
  validDatasetWeirdPaths,
  makeSnapshot
} from './fixtures';

test('runtime api v1 exports from graphdown index', () => {
  assert.equal(RUNTIME_API_VERSION_V1, 1);
  assert.equal(typeof openRuntimeApiV1, 'function');
});

test('runtime api v1 open returns session for valid dataset', async () => {
  const snapshot = validDatasetMinimal();
  const result = await openRuntimeApiV1({ snapshot });
  assert.equal(result.ok, true);
  if (!result.ok) {
    assert.fail('Expected ok result');
  }
  assert.equal(result.value.apiVersion, 1);
  assert.ok(result.value.capabilities.includes('gd.api.read'));
  assert.deepEqual(result.value.listTypeIds(), ['note']);
  const type = result.value.getType('note');
  assert.ok(type);
  assert.equal(type.typeId, 'note');
  const record = result.value.getRecord('note:one');
  assert.ok(record);
  assert.equal(record.recordKey, 'note:one');
});

test('runtime api v1 open fails for invalid snapshot and preserves validation errors exactly', async () => {
  const snapshots = [
    invalidDataset_missingFrontMatter(),
    invalidDataset_unknownTopLevelKey(),
    invalidDataset_missingTypeForRecord(),
    invalidDataset_badBlockPathUnderBlocks()
  ];

  for (const snapshot of snapshots) {
    const expected = validateDatasetSnapshot(snapshot);
    assert.equal(expected.ok, false);
    if (expected.ok) {
      assert.fail('Expected validation to fail');
    }
    const opened = await openRuntimeApiV1({ snapshot });
    assert.equal(opened.ok, false);
    if (opened.ok) {
      assert.fail('Expected open to fail');
    }
    assert.deepEqual(opened.errors, expected.errors);
  }
});

test('runtime api v1 methods are identity-addressed and path-independent', async () => {
  const snapshot = validDatasetWeirdPaths();
  const opened = await openRuntimeApiV1({ snapshot });
  assert.equal(opened.ok, true);
  if (!opened.ok) {
    assert.fail('Expected ok result');
  }
  assert.ok(opened.value.getType('note'));
  assert.ok(opened.value.getRecord('note:one'));
  assert.deepEqual(opened.value.listRecordKeysByType('note'), ['note:one']);
});

test('runtime api v1 exposes Record Link Graph adjacency', async () => {
  const snapshot = makeSnapshot({
    'types/note.md': typeFile('note'),
    'records/one.md': recordFile('note', 'one', 'See [[note:two]].'),
    'records/two.md': recordFile('note', 'two')
  });
  const opened = await openRuntimeApiV1({ snapshot });
  assert.equal(opened.ok, true);
  if (!opened.ok) {
    assert.fail('Expected ok result');
  }
  assert.deepEqual(opened.value.getOutgoingRecordLinks('note:one'), ['note:two']);
  assert.deepEqual(opened.value.getIncomingRecordLinks('note:two'), ['note:one']);
});

test('runtime api v1 open is async', async () => {
  const promise = openRuntimeApiV1({ snapshot: validDatasetMinimal() });
  assert.equal(typeof (promise as Promise<unknown>).then, 'function');
  await promise;
});
