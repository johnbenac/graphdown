const assert = require('node:assert/strict');
const test = require('node:test');

const { computeGdHashV1 } = require('../dist/core');

const encoder = new TextEncoder();

function snapshot(entries) {
  return { files: new Map(entries.map(([path, content]) => [path, encoder.encode(content)])) };
}

function digest(result) {
  assert.equal(result.ok, true);
  return result.digest;
}

test('HASH-003: snapshot hash is path-independent for records', () => {
  const typeFile = [
    'types/type--note.md',
    [
      '---',
      'id: type:note',
      'typeId: sys:type',
      'createdAt: 2024-01-01',
      'updatedAt: 2024-01-02',
      'fields:',
      '  recordTypeId: note',
      '---',
      'Type body'
    ].join('\n')
  ];

  const recordContent = [
    '---',
    'id: note:1',
    'typeId: note',
    'createdAt: 2024-01-03',
    'updatedAt: 2024-01-04',
    'fields:',
    '  title: Note',
    '---',
    'Body'
  ].join('\n');

  const snapshotA = snapshot([typeFile, ['records/note/record-1.md', recordContent]]);
  const snapshotB = snapshot([typeFile, ['records/note/subdir/record-1.md', recordContent]]);

  const digestA = digest(computeGdHashV1(snapshotA, 'snapshot'));
  const digestB = digest(computeGdHashV1(snapshotB, 'snapshot'));

  assert.equal(digestA, digestB);
});

test('HASH-002/HASH-003: schema hash changes on type edits; snapshot hash changes on data edits', () => {
  const baseType = [
    'types/type--note.md',
    [
      '---',
      'id: type:note',
      'typeId: sys:type',
      'createdAt: 2024-01-01',
      'updatedAt: 2024-01-02',
      'fields:',
      '  recordTypeId: note',
      '---',
      'Type body'
    ].join('\n')
  ];
  const baseRecord = [
    'records/note/record-1.md',
    [
      '---',
      'id: note:1',
      'typeId: note',
      'createdAt: 2024-01-03',
      'updatedAt: 2024-01-04',
      'fields:',
      '  title: Note',
      '---',
      'Body'
    ].join('\n')
  ];

  const snapshotBase = snapshot([baseType, baseRecord]);
  const schemaBase = digest(computeGdHashV1(snapshotBase, 'schema'));
  const snapshotBaseDigest = digest(computeGdHashV1(snapshotBase, 'snapshot'));

  const snapshotDataChanged = snapshot([
    baseType,
    [
      'records/note/record-1.md',
      baseRecord[1].replace('Body', 'Updated body')
    ]
  ]);

  const schemaAfterDataChange = digest(computeGdHashV1(snapshotDataChanged, 'schema'));
  const snapshotAfterDataChange = digest(computeGdHashV1(snapshotDataChanged, 'snapshot'));

  assert.equal(schemaAfterDataChange, schemaBase);
  assert.notEqual(snapshotAfterDataChange, snapshotBaseDigest);

  const snapshotSchemaChanged = snapshot([
    [
      'types/type--note.md',
      baseType[1].replace('Type body', 'New type body')
    ],
    baseRecord
  ]);

  const schemaAfterSchemaChange = digest(computeGdHashV1(snapshotSchemaChanged, 'schema'));
  const snapshotAfterSchemaChange = digest(computeGdHashV1(snapshotSchemaChanged, 'snapshot'));

  assert.notEqual(schemaAfterSchemaChange, schemaBase);
  assert.notEqual(snapshotAfterSchemaChange, snapshotBaseDigest);
});

test('HASH-001: line ending normalization produces stable hashes', () => {
  const typeUnix = [
    'types/type--note.md',
    [
      '---',
      'id: type:note',
      'typeId: sys:type',
      'createdAt: 2024-01-01',
      'updatedAt: 2024-01-02',
      'fields:',
      '  recordTypeId: note',
      '---',
      'Type body'
    ].join('\n')
  ];

  const typeWindows = [
    'types/type--note.md',
    typeUnix[1].replace(/\n/g, '\r\n')
  ];

  const digestUnix = digest(computeGdHashV1(snapshot([typeUnix]), 'schema'));
  const digestWindows = digest(computeGdHashV1(snapshot([typeWindows]), 'schema'));

  assert.equal(digestUnix, digestWindows);
});

test('HASH-001: non-record files do not affect hashes', () => {
  const typeFile = [
    'types/type--note.md',
    [
      '---',
      'id: type:note',
      'typeId: sys:type',
      'createdAt: 2024-01-01',
      'updatedAt: 2024-01-02',
      'fields:',
      '  recordTypeId: note',
      '---',
      'Type body'
    ].join('\n')
  ];

  const baseDigest = digest(computeGdHashV1(snapshot([typeFile]), 'schema'));
  const withReadmeDigest = digest(
    computeGdHashV1(
      snapshot([
        typeFile,
        ['README.md', '# docs\n']
      ]),
      'schema'
    )
  );

  assert.equal(baseDigest, withReadmeDigest);
});

test('HASH-001: duplicate ids fail hashing', () => {
  const typeFile = [
    'types/type--note.md',
    [
      '---',
      'id: type:note',
      'typeId: sys:type',
      'createdAt: 2024-01-01',
      'updatedAt: 2024-01-02',
      'fields:',
      '  recordTypeId: note',
      '---',
      'Type body'
    ].join('\n')
  ];

  const dupTypeFile = [
    'types/type--note-copy.md',
    typeFile[1]
  ];

  const result = computeGdHashV1(snapshot([typeFile, dupTypeFile]), 'schema');
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.code === 'E_DUPLICATE_ID'));
});

test('HASH-001: ids are ordered deterministically by UTF-8 bytes', () => {
  const recordA = [
    'records/note/a.md',
    [
      '---',
      'id: a',
      'typeId: note',
      'createdAt: 2024-01-01',
      'updatedAt: 2024-01-02',
      'fields: {}',
      '---'
    ].join('\n')
  ];
  const recordUmlaut = [
    'records/note/u.md',
    [
      '---',
      'id: ä',
      'typeId: note',
      'createdAt: 2024-01-01',
      'updatedAt: 2024-01-02',
      'fields: {}',
      '---'
    ].join('\n')
  ];
  const recordZ = [
    'records/note/z.md',
    [
      '---',
      'id: z',
      'typeId: note',
      'createdAt: 2024-01-01',
      'updatedAt: 2024-01-02',
      'fields: {}',
      '---'
    ].join('\n')
  ];

  const digest1 = digest(computeGdHashV1(snapshot([recordZ, recordUmlaut, recordA]), 'snapshot'));
  const digest2 = digest(computeGdHashV1(snapshot([recordUmlaut, recordA, recordZ]), 'snapshot'));

  assert.equal(digest1, digest2);
});

test('HASH-002: schema hash ignores type file paths', () => {
  const typeContent = [
    '---',
    'id: type:note',
    'typeId: sys:type',
    'createdAt: 2024-01-01',
    'updatedAt: 2024-01-02',
    'fields:',
    '  recordTypeId: note',
    '---',
    'Type body'
  ].join('\n');

  const digestA = digest(computeGdHashV1(snapshot([['types/type--note.md', typeContent]]), 'schema'));
  const digestB = digest(
    computeGdHashV1(snapshot([['types/subdir/type--note.md', typeContent]]), 'schema')
  );

  assert.equal(digestA, digestB);
});

test('HASH-001: invalid UTF-8 fails hashing with E_UTF8_INVALID', () => {
  const badBytes = new Uint8Array([0xff, 0xfe]);
  const result = computeGdHashV1({ files: new Map([['types/type--bad.md', badBytes]]) }, 'schema');
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.code === 'E_UTF8_INVALID'));
});

test('HASH-004: unknown hash scopes are rejected', () => {
  const typeFile = [
    'types/type--note.md',
    [
      '---',
      'id: type:note',
      'typeId: sys:type',
      'createdAt: 2024-01-01',
      'updatedAt: 2024-01-02',
      'fields:',
      '  recordTypeId: note',
      '---',
      'Type body'
    ].join('\n')
  ];

  const result = computeGdHashV1(snapshot([typeFile]), 'records');

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.code === 'E_USAGE'));
});
