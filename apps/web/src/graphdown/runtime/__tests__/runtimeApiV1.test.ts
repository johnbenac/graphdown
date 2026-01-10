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

test('runtime api v1 listTypes + listRecordsByType return deterministic sorted views', async () => {
  const snapshot = makeSnapshot({
    'z/records.md': recordFile('note', 'b'),
    'a/types.md': typeFile('note'),
    'x/records.md': recordFile('note', 'a'),
    'types/task.md': typeFile('task')
  });

  const opened = await openRuntimeApiV1({ snapshot });
  assert.equal(opened.ok, true);
  if (!opened.ok) {
    assert.fail('Expected ok result');
  }

  assert.deepEqual(opened.value.listTypeIds(), ['note', 'task']);
  assert.deepEqual(
    opened.value.listTypes().map((type) => type.typeId),
    ['note', 'task']
  );

  assert.deepEqual(opened.value.listRecordKeysByType('note'), ['note:a', 'note:b']);
  assert.deepEqual(
    opened.value.listRecordsByType('note').map((record) => record.recordKey),
    ['note:a', 'note:b']
  );
});

test('runtime api v1 raw markdown bytes preserve original bytes (no newline normalization)', async () => {
  const typeText = `---\r\ntypeId: note\r\nfields: {}\r\n---\r\n\r\n`;
  const recordText = `---\r\ntypeId: note\r\nrecordId: one\r\nfields: {}\r\n---\r\nBody\r\n`;

  const snapshot = makeSnapshot({
    't.md': typeText,
    'r.md': recordText
  });

  const opened = await openRuntimeApiV1({ snapshot });
  assert.equal(opened.ok, true);
  if (!opened.ok) {
    assert.fail('Expected ok result');
  }

  const typeBytes = opened.value.getTypeMarkdownBytes('note');
  assert.ok(typeBytes);
  assert.equal(new TextDecoder().decode(typeBytes!), typeText);

  const recordBytes = opened.value.getRecordMarkdownBytes('note:one');
  assert.ok(recordBytes);
  assert.equal(new TextDecoder().decode(recordBytes!), recordText);
});

test('runtime api v1 raw bytes are returned as copies', async () => {
  const snapshot = validDatasetMinimal();
  const opened = await openRuntimeApiV1({ snapshot });
  assert.equal(opened.ok, true);
  if (!opened.ok) {
    assert.fail('Expected ok result');
  }

  const first = opened.value.getRecordMarkdownBytes('note:one');
  assert.ok(first);

  first![0] = 0;

  const second = opened.value.getRecordMarkdownBytes('note:one');
  assert.ok(second);
  assert.notEqual(second![0], 0);
});

test('runtime api v1 view getters return isolated copies (mutations do not affect subsequent reads)', async () => {
  const snapshot = makeSnapshot({
    'types/note.md': typeFile('note'),
    'records/one.md': ['---', 'typeId: note', 'recordId: one', 'fields:', '  title: hello', '---', 'Body'].join('\n')
  });

  const opened = await openRuntimeApiV1({ snapshot });
  assert.equal(opened.ok, true);
  if (!opened.ok) {
    assert.fail('Expected ok result');
  }

  const first = opened.value.getRecord('note:one');
  assert.ok(first);
  (first!.fields as { title?: string }).title = 'MUTATED';

  const second = opened.value.getRecord('note:one');
  assert.ok(second);
  assert.equal((second!.fields as { title?: string }).title, 'hello');
});

test('runtime api v1 open is async', async () => {
  const promise = openRuntimeApiV1({ snapshot: validDatasetMinimal() });
  assert.equal(typeof (promise as Promise<unknown>).then, 'function');
  await promise;
});
