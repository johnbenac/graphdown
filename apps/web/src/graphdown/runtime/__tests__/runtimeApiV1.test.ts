import assert from 'node:assert/strict';
import { test } from 'vitest';

import { openRuntimeApiV1, RUNTIME_API_VERSION_V1, validateDatasetSnapshot } from '../../index';
import {
  invalidDataset_badBlockPathUnderBlocks,
  invalidDataset_missingFrontMatter,
  invalidDataset_missingTypeForRecord,
  invalidDataset_unknownTopLevelKey,
  makeSnapshot,
  recordFile,
  typeFile,
  validDatasetMinimal,
  validDatasetWeirdPaths,
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
  assert.ok(result.value.getType('note'));
  assert.equal(result.value.getType('note')?.typeId, 'note');
  assert.ok(result.value.getRecord('note:one'));
  assert.equal(result.value.getRecord('note:one')?.recordKey, 'note:one');
});

test('runtime api v1 open fails for invalid snapshot and preserves validation errors exactly', async () => {
  const missingFrontMatter = invalidDataset_missingFrontMatter();
  const expectedMissingFrontMatter = validateDatasetSnapshot(missingFrontMatter);
  assert.equal(expectedMissingFrontMatter.ok, false);
  if (expectedMissingFrontMatter.ok) {
    assert.fail('Expected validation errors for missing front matter');
  }
  const openedMissingFrontMatter = await openRuntimeApiV1({ snapshot: missingFrontMatter });
  assert.equal(openedMissingFrontMatter.ok, false);
  if (openedMissingFrontMatter.ok) {
    assert.fail('Expected open to fail for missing front matter');
  }
  assert.deepEqual(openedMissingFrontMatter.errors, expectedMissingFrontMatter.errors);

  const unknownTopLevelKey = invalidDataset_unknownTopLevelKey();
  const expectedUnknownTopLevelKey = validateDatasetSnapshot(unknownTopLevelKey);
  assert.equal(expectedUnknownTopLevelKey.ok, false);
  if (expectedUnknownTopLevelKey.ok) {
    assert.fail('Expected validation errors for unknown top-level key');
  }
  const openedUnknownTopLevelKey = await openRuntimeApiV1({ snapshot: unknownTopLevelKey });
  assert.equal(openedUnknownTopLevelKey.ok, false);
  if (openedUnknownTopLevelKey.ok) {
    assert.fail('Expected open to fail for unknown top-level key');
  }
  assert.deepEqual(openedUnknownTopLevelKey.errors, expectedUnknownTopLevelKey.errors);

  const missingTypeForRecord = invalidDataset_missingTypeForRecord();
  const expectedMissingTypeForRecord = validateDatasetSnapshot(missingTypeForRecord);
  assert.equal(expectedMissingTypeForRecord.ok, false);
  if (expectedMissingTypeForRecord.ok) {
    assert.fail('Expected validation errors for missing type for record');
  }
  const openedMissingTypeForRecord = await openRuntimeApiV1({ snapshot: missingTypeForRecord });
  assert.equal(openedMissingTypeForRecord.ok, false);
  if (openedMissingTypeForRecord.ok) {
    assert.fail('Expected open to fail for missing type for record');
  }
  assert.deepEqual(openedMissingTypeForRecord.errors, expectedMissingTypeForRecord.errors);

  const badBlockPathUnderBlocks = invalidDataset_badBlockPathUnderBlocks();
  const expectedBadBlockPathUnderBlocks = validateDatasetSnapshot(badBlockPathUnderBlocks);
  assert.equal(expectedBadBlockPathUnderBlocks.ok, false);
  if (expectedBadBlockPathUnderBlocks.ok) {
    assert.fail('Expected validation errors for bad block path');
  }
  const openedBadBlockPathUnderBlocks = await openRuntimeApiV1({ snapshot: badBlockPathUnderBlocks });
  assert.equal(openedBadBlockPathUnderBlocks.ok, false);
  if (openedBadBlockPathUnderBlocks.ok) {
    assert.fail('Expected open to fail for bad block path');
  }
  assert.deepEqual(openedBadBlockPathUnderBlocks.errors, expectedBadBlockPathUnderBlocks.errors);
});

test('runtime api v1 methods are identity-addressed and path-independent', async () => {
  const snapshot = validDatasetWeirdPaths();
  const opened = await openRuntimeApiV1({ snapshot });
  assert.equal(opened.ok, true);
  if (!opened.ok) {
    assert.fail('Expected open to succeed');
  }
  assert.ok(opened.value.getType('note'));
  assert.ok(opened.value.getRecord('note:one'));
  assert.deepEqual(opened.value.listRecordKeysByType('note'), ['note:one']);
});

test('runtime api v1 exposes Record Link Graph adjacency', async () => {
  const snapshot = makeSnapshot({
    'types/note.md': typeFile('note'),
    'records/note/one.md': recordFile('note', 'one', 'See [[note:two]].'),
    'records/note/two.md': recordFile('note', 'two'),
  });
  const opened = await openRuntimeApiV1({ snapshot });
  assert.equal(opened.ok, true);
  if (!opened.ok) {
    assert.fail('Expected open to succeed');
  }
  assert.deepEqual(opened.value.getOutgoingRecordLinks('note:one'), ['note:two']);
  assert.deepEqual(opened.value.getIncomingRecordLinks('note:two'), ['note:one']);
});

test('runtime api v1 open is async', async () => {
  const promise = openRuntimeApiV1({ snapshot: validDatasetMinimal() });
  assert.equal(typeof (promise as Promise<unknown>).then, 'function');
  await promise;
});
