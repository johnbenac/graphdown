import assert from 'node:assert/strict';
import { test } from 'vitest';

import { blockPathForCid, cidFromRawBytes, validateDatasetSnapshot } from '@graphdown/core';
import { openRuntimeApiV1, RUNTIME_API_VERSION_V1 } from '../index';
import {
  invalidDataset_badBlockPathUnderBlocks,
  invalidDataset_missingFields,
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
    invalidDataset_missingFields(),
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

test('API-DET-002: runtime api v1 listTypes + listRecordsByType return deterministic sorted views', async () => {
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

test('API-SESSION-002: raw bytes are returned as copies', async () => {
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
  const typeBytes = utf8('block-type');
  const typeCid = cidFromRawBytes(typeBytes);
  const pluginBytes = utf8('block-plugin');
  const pluginCid = cidFromRawBytes(pluginBytes);
  const garbageBytes = utf8('block-two');
  const garbageCid = cidFromRawBytes(garbageBytes);
  const missingCid = cidFromRawBytes(utf8('block-missing'));
  const snapshot = makeSnapshot({
    'types/note.md': typeFile('note', `Type body [[${typeCid}]].`),
    'records/note-one.md': recordFile('note', 'one', `See [[${referencedCid}]].`),
    'extensions/demo/plugin.md': [
      '---',
      'pluginId: demo',
      'gdApiVersion: 1',
      'entry: entry.js',
      'files:',
      '  - entry.js',
      '  - asset.bin',
      'binaryFiles:',
      '  - asset.bin',
      'blocks:',
      `  - ${pluginCid}`,
      '---',
      'Demo plugin'
    ].join('\n'),
    'extensions/demo/entry.js': utf8('console.log("demo");'),
    'extensions/demo/asset.bin': Uint8Array.of(0, 255, 1),
    [blockPathForCid(referencedCid)]: referencedBytes,
    [blockPathForCid(typeCid)]: typeBytes,
    [blockPathForCid(pluginCid)]: pluginBytes,
    [blockPathForCid(garbageCid)]: garbageBytes
  });
  const opened = await openRuntimeApiV1({ snapshot });
  assert.equal(opened.ok, true);
  if (!opened.ok) {
    assert.fail('Expected ok result');
  }
  const expectedPresent = [garbageCid, referencedCid, typeCid, pluginCid].sort((a, b) =>
    a.localeCompare(b)
  );
  assert.deepEqual(await opened.value.listBlockCidsPresent(), expectedPresent);
  const expectedReachable = [pluginCid, referencedCid, typeCid].sort((a, b) => a.localeCompare(b));
  assert.deepEqual(await opened.value.listReachableBlockCids(), expectedReachable);
  assert.deepEqual(await opened.value.listBlockCidsReferencedByRecord('note:one'), [
    referencedCid
  ]);
  assert.equal(await opened.value.hasBlock(referencedCid), true);
  assert.equal(await opened.value.hasBlock(garbageCid), true);
  assert.equal(await opened.value.hasBlock(missingCid), false);
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

test('API-SESSION-002: block bytes are returned as copies', async () => {
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

test('API-SESSION-002: view getters return isolated copies (mutations do not affect subsequent reads)', async () => {
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
  const bytes = utf8('present-block');
  const cid = cidFromRawBytes(bytes);
  const snapshot = makeSnapshot({
    'types/note.md': typeFile('note'),
    'records/note-one.md': recordFile('note', 'one'),
    [blockPathForCid(cid)]: bytes
  });
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
    api.getBlockBytes(cid),
    api.hasBlock(cid),
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
  const typeBytes = await api.getTypeMarkdownBytes('note');
  const recordBytes = await api.getRecordMarkdownBytes('note:one');
  assert.doesNotThrow(() => structuredClone(typeBytes));
  assert.doesNotThrow(() => structuredClone(recordBytes));
  const listTypes = await api.listTypes();
  const listRecords = await api.listRecordsByType('note');
  const listEdges = await api.listTypeCompositionEdges();
  assert.doesNotThrow(() => structuredClone(listTypes));
  assert.doesNotThrow(() => structuredClone(listRecords));
  assert.doesNotThrow(() => structuredClone(listEdges));
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
    'types/note.md': ['---', 'typeId: note', 'fields:', '  any: value', '---', 'body'].join(
      '\n'
    ),
    'records/one.md': recordFile('note', 'one')
  });
  const opened = await openRuntimeApiV1({ snapshot });
  assert.equal(opened.ok, true);
  if (!opened.ok) {
    assert.fail('Expected ok result');
  }
  const api = opened.value;
  const t1 = await api.getType('note');
  assert.ok(t1);
  (t1.fields as Record<string, unknown>).any = 'MUTATED';
  const t2 = await api.getType('note');
  assert.ok(t2);
  assert.equal((t2.fields as Record<string, unknown>).any, 'value');
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
  const a1 = await api.listTypeIds();
  const a2 = await api.listTypeIds();
  assert.deepEqual(a1, a2);
  const r1 = await api.listRecordKeysByType('note');
  const r2 = await api.listRecordKeysByType('note');
  assert.deepEqual(r1, r2);
  const blocks1 = await api.listBlockCidsPresent();
  const blocks2 = await api.listBlockCidsPresent();
  assert.deepEqual(blocks1, blocks2);
});
