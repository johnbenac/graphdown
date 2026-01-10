import assert from 'node:assert/strict';
import { test } from 'vitest';

import {
  blockPathForCid,
  cidFromRawBytes,
  openRuntimeApiV1,
  RUNTIME_API_VERSION_V1,
  validateDatasetSnapshot
} from '../../index';
import {
  invalidDataset_badBlockPathUnderBlocks,
  invalidDataset_missingFrontMatter,
  invalidDataset_missingTypeForRecord,
  invalidDataset_unknownTopLevelKey,
  recordFile,
  typeFile,
  utf8,
  validDatasetMinimal,
  validDatasetWeirdPaths,
  makeSnapshot
} from './fixtures';

test('API-001: runtime api v1 is explicitly versioned', async () => {
  assert.equal(RUNTIME_API_VERSION_V1, 1);
  const snapshot = validDatasetMinimal();
  const result = await openRuntimeApiV1({ snapshot });
  assert.equal(result.ok, true);
  if (!result.ok) {
    assert.fail('Expected ok result');
  }
  assert.equal(result.value.apiVersion, 1);
});

test('API-002: capabilities are discoverable and include gd.api.read', async () => {
  const snapshot = validDatasetMinimal();
  const result = await openRuntimeApiV1({ snapshot });
  assert.equal(result.ok, true);
  if (!result.ok) {
    assert.fail('Expected ok result');
  }
  assert.ok(result.value.capabilities.includes('gd.api.read'));
  assert.deepEqual(result.value.capabilities, ['gd.api.read']);
});

test('runtime api v1 open returns session for valid dataset', async () => {
  const snapshot = validDatasetMinimal();
  const result = await openRuntimeApiV1({ snapshot });
  assert.equal(result.ok, true);
  if (!result.ok) {
    assert.fail('Expected ok result');
  }
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

test('API-004: runtime api methods are identity-addressed and path-independent', async () => {
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

test('runtime api v1 exposes record hierarchy based on parent pointers', async () => {
  const snapshot = makeSnapshot({
    'types/note.md': typeFile('note'),
    'records/root.md': recordFile('note', 'root'),
    'records/child.md': recordFile('note', 'child', '', ['parent: note:root']),
    'records/linked.md': recordFile('note', 'linked', 'See [[note:root]].')
  });
  const opened = await openRuntimeApiV1({ snapshot });
  assert.equal(opened.ok, true);
  if (!opened.ok) {
    assert.fail('Expected ok result');
  }
  assert.equal(opened.value.getParentRecordKey('note:root'), null);
  assert.equal(opened.value.getParentRecordKey('note:child'), 'note:root');
  assert.deepEqual(opened.value.listChildRecordKeys('note:root'), ['note:child']);
  assert.deepEqual(opened.value.listChildRecordKeys('missing:record'), []);
  assert.deepEqual(opened.value.listRootRecordKeysByType('note'), ['note:linked', 'note:root']);
});

test('runtime api v1 exposes type composition dependencies', async () => {
  const snapshot = makeSnapshot({
    'types/car.md': [
      '---',
      'typeId: car',
      'fields:',
      '  composition:',
      '    wheel:',
      '      typeId: wheel',
      '      required: false',
      '    engine:',
      '      typeId: engine',
      '      required: true',
      '---',
      ''
    ].join('\n'),
    'types/engine.md': typeFile('engine'),
    'types/wheel.md': typeFile('wheel'),
    'records/engine.md': recordFile('engine', 'e1'),
    'records/car.md': recordFile('car', 'c1', 'See [[engine:e1]].')
  });
  const opened = await openRuntimeApiV1({ snapshot });
  assert.equal(opened.ok, true);
  if (!opened.ok) {
    assert.fail('Expected ok result');
  }
  assert.deepEqual(opened.value.getTypeCompositionComponents('car'), [
    { name: 'engine', componentTypeId: 'engine', required: true },
    { name: 'wheel', componentTypeId: 'wheel', required: false }
  ]);
  assert.deepEqual(opened.value.listTypeCompositionEdges(), [
    { fromTypeId: 'car', componentName: 'engine', toTypeId: 'engine', required: true },
    { fromTypeId: 'car', componentName: 'wheel', toTypeId: 'wheel', required: false }
  ]);
  assert.deepEqual(opened.value.getTypeCompositionComponents('engine'), []);
  assert.equal(opened.value.getTypeCompositionComponents('missing'), null);
  const first = opened.value.getTypeCompositionComponents('car');
  assert.ok(first);
  first[0].name = 'MUTATED';
  const second = opened.value.getTypeCompositionComponents('car');
  assert.ok(second);
  assert.equal(second[0].name, 'engine');
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
  assert.equal(new TextDecoder().decode(typeBytes), typeText);
  const recordBytes = opened.value.getRecordMarkdownBytes('note:one');
  assert.ok(recordBytes);
  assert.equal(new TextDecoder().decode(recordBytes), recordText);
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
  first[0] = 0;
  const second = opened.value.getRecordMarkdownBytes('note:one');
  assert.ok(second);
  assert.notEqual(second[0], 0);
});

test('runtime api v1 exposes block read methods', async () => {
  const referencedBytes = utf8('block-one');
  const referencedCid = cidFromRawBytes(referencedBytes);
  const garbageBytes = utf8('block-two');
  const garbageCid = cidFromRawBytes(garbageBytes);
  const snapshot = makeSnapshot({
    'types/note.md': typeFile('note'),
    'records/note-one.md': recordFile('note', 'one', `See [[${referencedCid}]].`),
    [blockPathForCid(referencedCid)]: referencedBytes,
    [blockPathForCid(garbageCid)]: garbageBytes
  });
  const opened = await openRuntimeApiV1({ snapshot });
  assert.equal(opened.ok, true);
  if (!opened.ok) {
    assert.fail('Expected ok result');
  }
  const expectedPresent = [garbageCid, referencedCid].sort((a, b) => a.localeCompare(b));
  assert.deepEqual(opened.value.listBlockCidsPresent(), expectedPresent);
  assert.deepEqual(opened.value.listReachableBlockCids(), [referencedCid]);
  assert.deepEqual(opened.value.listBlockCidsReferencedByRecord('note:one'), [referencedCid]);
  assert.equal(opened.value.hasBlock(referencedCid), true);
  assert.equal(opened.value.hasBlock(garbageCid), true);
  assert.equal(opened.value.hasBlock('gdblob:sha256-' + '0'.repeat(64)), false);
  const bytes = opened.value.getBlockBytes(referencedCid);
  assert.ok(bytes);
  assert.deepEqual(bytes, referencedBytes);
});

test('runtime api v1 extracts block refs from nested field strings', async () => {
  const cidOne = cidFromRawBytes(utf8('nested-one'));
  const cidTwo = cidFromRawBytes(utf8('nested-two'));
  const snapshot = makeSnapshot({
    'types/note.md': typeFile('note'),
    'records/note-one.md': [
      '---',
      'typeId: note',
      'recordId: one',
      'fields:',
      `  title: "See [[${cidOne}]]"`,
      '  nested:',
      '    list:',
      `      - "Also [[${cidTwo}]]"`,
      '      - inner:',
      '          text: "No refs here"',
      '---',
      'Body'
    ].join('\n'),
    [blockPathForCid(cidOne)]: utf8('nested-one'),
    [blockPathForCid(cidTwo)]: utf8('nested-two')
  });
  const opened = await openRuntimeApiV1({ snapshot });
  assert.equal(opened.ok, true);
  if (!opened.ok) {
    assert.fail('Expected ok result');
  }
  const expected = [cidOne, cidTwo].sort((a, b) => a.localeCompare(b));
  assert.deepEqual(opened.value.listBlockCidsReferencedByRecord('note:one'), expected);
});

test('runtime api v1 block bytes are returned as copies', async () => {
  const bytes = utf8('immutable');
  const cid = cidFromRawBytes(bytes);
  const snapshot = makeSnapshot({
    'types/note.md': typeFile('note'),
    'records/note-one.md': recordFile('note', 'one', `See [[${cid}]].`),
    [blockPathForCid(cid)]: bytes
  });
  const opened = await openRuntimeApiV1({ snapshot });
  assert.equal(opened.ok, true);
  if (!opened.ok) {
    assert.fail('Expected ok result');
  }
  const first = opened.value.getBlockBytes(cid);
  assert.ok(first);
  first[0] = 0;
  const second = opened.value.getBlockBytes(cid);
  assert.ok(second);
  assert.notEqual(second[0], 0);
});

test('runtime api v1 block methods ignore invalid cid inputs', async () => {
  const snapshot = validDatasetMinimal();
  const opened = await openRuntimeApiV1({ snapshot });
  assert.equal(opened.ok, true);
  if (!opened.ok) {
    assert.fail('Expected ok result');
  }
  assert.doesNotThrow(() => opened.value.hasBlock('not-a-cid'));
  assert.doesNotThrow(() => opened.value.getBlockBytes('not-a-cid'));
  assert.equal(opened.value.hasBlock('not-a-cid'), false);
  assert.equal(opened.value.getBlockBytes('not-a-cid'), null);
});

test('runtime api v1 view getters return isolated copies (mutations do not affect subsequent reads)', async () => {
  const snapshot = makeSnapshot({
    'types/note.md': typeFile('note'),
    'records/one.md': [
      '---',
      'typeId: note',
      'recordId: one',
      'fields:',
      '  title: hello',
      '---',
      'Body'
    ].join('\n')
  });
  const opened = await openRuntimeApiV1({ snapshot });
  assert.equal(opened.ok, true);
  if (!opened.ok) {
    assert.fail('Expected ok result');
  }
  const first = opened.value.getRecord('note:one');
  assert.ok(first);
  (first.fields as Record<string, unknown>).title = 'MUTATED';
  const second = opened.value.getRecord('note:one');
  assert.ok(second);
  assert.equal((second.fields as Record<string, unknown>).title, 'hello');
});

test('runtime api v1 open is async', async () => {
  const promise = openRuntimeApiV1({ snapshot: validDatasetMinimal() });
  assert.equal(typeof (promise as Promise<unknown>).then, 'function');
  await promise;
});
