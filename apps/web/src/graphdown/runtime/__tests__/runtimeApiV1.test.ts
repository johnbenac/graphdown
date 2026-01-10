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

function expectThenable(value: unknown): void {
  const v = value as { then?: unknown };
  assert.equal(typeof v?.then, 'function');
}

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
  assert.deepEqual(await result.value.listTypeIds(), ['note']);
  const type = await result.value.getType('note');
  assert.ok(type);
  assert.equal(type.typeId, 'note');
  const record = await result.value.getRecord('note:one');
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
  assert.ok(await opened.value.getType('note'));
  assert.ok(await opened.value.getRecord('note:one'));
  assert.deepEqual(await opened.value.listRecordKeysByType('note'), ['note:one']);
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
  assert.deepEqual(await opened.value.getOutgoingRecordLinks('note:one'), ['note:two']);
  assert.deepEqual(await opened.value.getIncomingRecordLinks('note:two'), ['note:one']);
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
  assert.equal(await opened.value.getParentRecordKey('note:root'), null);
  assert.equal(await opened.value.getParentRecordKey('note:child'), 'note:root');
  assert.deepEqual(await opened.value.listChildRecordKeys('note:root'), ['note:child']);
  assert.deepEqual(await opened.value.listChildRecordKeys('missing:record'), []);
  assert.deepEqual(await opened.value.listRootRecordKeysByType('note'), ['note:linked', 'note:root']);
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
  assert.deepEqual(await opened.value.getTypeCompositionComponents('car'), [
    { name: 'engine', componentTypeId: 'engine', required: true },
    { name: 'wheel', componentTypeId: 'wheel', required: false }
  ]);
  assert.deepEqual(await opened.value.listTypeCompositionEdges(), [
    { fromTypeId: 'car', componentName: 'engine', toTypeId: 'engine', required: true },
    { fromTypeId: 'car', componentName: 'wheel', toTypeId: 'wheel', required: false }
  ]);
  assert.deepEqual(await opened.value.getTypeCompositionComponents('engine'), []);
  assert.equal(await opened.value.getTypeCompositionComponents('missing'), null);
  const first = await opened.value.getTypeCompositionComponents('car');
  assert.ok(first);
  first[0].name = 'MUTATED';
  const second = await opened.value.getTypeCompositionComponents('car');
  assert.ok(second);
  assert.equal(second[0].name, 'engine');
});

test('API-DET-002: listTypes + listRecordsByType return deterministic sorted views', async () => {
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
  assert.deepEqual(await opened.value.listTypeIds(), ['note', 'task']);
  assert.deepEqual(
    (await opened.value.listTypes()).map((type) => type.typeId),
    ['note', 'task']
  );
  assert.deepEqual(await opened.value.listRecordKeysByType('note'), ['note:a', 'note:b']);
  assert.deepEqual(
    (await opened.value.listRecordsByType('note')).map((record) => record.recordKey),
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
  const typeBytes = await opened.value.getTypeMarkdownBytes('note');
  assert.ok(typeBytes);
  assert.equal(new TextDecoder().decode(typeBytes), typeText);
  const recordBytes = await opened.value.getRecordMarkdownBytes('note:one');
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
  const first = await opened.value.getRecordMarkdownBytes('note:one');
  assert.ok(first);
  first[0] = 0;
  const second = await opened.value.getRecordMarkdownBytes('note:one');
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
  assert.deepEqual(await opened.value.listBlockCidsPresent(), expectedPresent);
  assert.deepEqual(await opened.value.listReachableBlockCids(), [referencedCid]);
  assert.deepEqual(await opened.value.listBlockCidsReferencedByRecord('note:one'), [referencedCid]);
  assert.equal(await opened.value.hasBlock(referencedCid), true);
  assert.equal(await opened.value.hasBlock(garbageCid), true);
  assert.equal(await opened.value.hasBlock('gdblob:sha256-' + '0'.repeat(64)), false);
  const bytes = await opened.value.getBlockBytes(referencedCid);
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
  assert.deepEqual(await opened.value.listBlockCidsReferencedByRecord('note:one'), expected);
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
  const first = await opened.value.getBlockBytes(cid);
  assert.ok(first);
  first[0] = 0;
  const second = await opened.value.getBlockBytes(cid);
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
  assert.equal(await opened.value.hasBlock('not-a-cid'), false);
  assert.equal(await opened.value.getBlockBytes('not-a-cid'), null);
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
  const first = await opened.value.getRecord('note:one');
  assert.ok(first);
  (first.fields as Record<string, unknown>).title = 'MUTATED';
  const second = await opened.value.getRecord('note:one');
  assert.ok(second);
  assert.equal((second.fields as Record<string, unknown>).title, 'hello');
});

test('API-003: all Runtime API operations are asynchronous (thenable)', async () => {
  const snapshot = validDatasetMinimal();
  const opened = await openRuntimeApiV1({ snapshot });
  assert.equal(opened.ok, true);
  if (!opened.ok) {
    assert.fail('Expected ok result');
  }

  const api = opened.value;
  const calls = [
    api.listTypeIds(),
    api.listRecordKeysByType('note'),
    api.getType('note'),
    api.getRecord('note:one'),
    api.getParentRecordKey('note:one'),
    api.listChildRecordKeys('note:one'),
    api.listRootRecordKeysByType('note'),
    api.getTypeCompositionComponents('note'),
    api.listTypeCompositionEdges(),
    api.getOutgoingRecordLinks('note:one'),
    api.getIncomingRecordLinks('note:one'),
    api.listTypes(),
    api.listRecordsByType('note'),
    api.getTypeMarkdownBytes('note'),
    api.getRecordMarkdownBytes('note:one'),
    api.getBlockBytes('not-a-cid'),
    api.hasBlock('not-a-cid'),
    api.listBlockCidsPresent(),
    api.listBlockCidsReferencedByRecord('note:one'),
    api.listReachableBlockCids()
  ];

  for (const call of calls) {
    expectThenable(call);
  }

  await Promise.all(calls);
});

test('API-005: Runtime API payloads are structured-clone compatible', async () => {
  const snapshot = validDatasetMinimal();
  const opened = await openRuntimeApiV1({ snapshot });
  assert.equal(opened.ok, true);
  if (!opened.ok) {
    assert.fail('Expected ok result');
  }

  const api = opened.value;
  const typeIds = await api.listTypeIds();
  const type = await api.getType('note');
  const record = await api.getRecord('note:one');

  assert.doesNotThrow(() => structuredClone(typeIds));
  assert.doesNotThrow(() => structuredClone(type));
  assert.doesNotThrow(() => structuredClone(record));

  const types = await api.listTypes();
  const records = await api.listRecordsByType('note');
  const edges = await api.listTypeCompositionEdges();
  assert.doesNotThrow(() => structuredClone(types));
  assert.doesNotThrow(() => structuredClone(records));
  assert.doesNotThrow(() => structuredClone(edges));

  const typeBytes = await api.getTypeMarkdownBytes('note');
  const recordBytes = await api.getRecordMarkdownBytes('note:one');
  assert.doesNotThrow(() => structuredClone(typeBytes));
  assert.doesNotThrow(() => structuredClone(recordBytes));
});

test('API-SESSION-002: listRecordsByType returns isolated copies', async () => {
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

  const api = opened.value;
  const firstList = await api.listRecordsByType('note');
  assert.equal(firstList.length, 1);
  (firstList[0].fields as Record<string, unknown>).title = 'MUTATED';

  const secondList = await api.listRecordsByType('note');
  assert.equal((secondList[0].fields as Record<string, unknown>).title, 'hello');
});

test('API-SESSION-002: getType returns isolated copies', async () => {
  const snapshot = makeSnapshot({
    'types/note.md': ['---', 'typeId: note', 'fields:', '  any: value', '---', 'body'].join('\n'),
    'records/one.md': recordFile('note', 'one')
  });
  const opened = await openRuntimeApiV1({ snapshot });
  assert.equal(opened.ok, true);
  if (!opened.ok) {
    assert.fail('Expected ok result');
  }

  const api = opened.value;
  const first = await api.getType('note');
  assert.ok(first);
  (first.fields as Record<string, unknown>).any = 'MUTATED';

  const second = await api.getType('note');
  assert.ok(second);
  assert.equal((second.fields as Record<string, unknown>).any, 'value');
});

test('API-DET-001: read results are deterministic for a fixed snapshot', async () => {
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
  const api = opened.value;

  const typeIdsFirst = await api.listTypeIds();
  const typeIdsSecond = await api.listTypeIds();
  assert.deepEqual(typeIdsFirst, typeIdsSecond);

  const recordKeysFirst = await api.listRecordKeysByType('note');
  const recordKeysSecond = await api.listRecordKeysByType('note');
  assert.deepEqual(recordKeysFirst, recordKeysSecond);

  const blocksFirst = await api.listBlockCidsPresent();
  const blocksSecond = await api.listBlockCidsPresent();
  assert.deepEqual(blocksFirst, blocksSecond);
});
