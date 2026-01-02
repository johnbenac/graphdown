const assert = require('node:assert/strict');
const test = require('node:test');

const { computeGdHashV1 } = require('../dist/core');

const encoder = new TextEncoder();

function snapshot(entries) {
  return { files: new Map(entries.map(([path, content]) => [path, encoder.encode(content)])) };
}

function typeFile(path, typeId) {
  return [
    path,
    ['---', `typeId: ${typeId}`, 'fields: {}', '---', ''].join('\n')
  ];
}

function recordFile(path, typeId, recordId, body = '') {
  return [
    path,
    ['---', `typeId: ${typeId}`, `recordId: ${recordId}`, 'fields: {}', '---', body].join('\n')
  ];
}

function digest(result) {
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  return result.digest;
}

test('HASH-003: snapshot hash is path-independent for record files', () => {
  const type = typeFile('types/note.md', 'note');
  const recordContent = recordFile('records/note/one.md', 'note', 'one', 'Body');

  const snapshotA = snapshot([type, recordContent]);
  const snapshotB = snapshot([type, ['some/other/path.md', recordContent[1]]]);

  const digestA = digest(computeGdHashV1(snapshotA, 'snapshot'));
  const digestB = digest(computeGdHashV1(snapshotB, 'snapshot'));

  assert.equal(digestA, digestB);
});

test('HASH-002: schema fingerprint ignores record object changes', () => {
  const type = typeFile('type.md', 'note');
  const record = recordFile('r.md', 'note', 'one', 'Body');
  const base = snapshot([type, record]);

  const schemaDigest = digest(computeGdHashV1(base, 'schema'));
  const snapshotDigest = digest(computeGdHashV1(base, 'snapshot'));

  const schemaChanged = snapshot([[type[0], type[1].replace('fields: {}', 'fields:\n  extra: true')], record]);
  const schemaChangedDigest = digest(computeGdHashV1(schemaChanged, 'schema'));
  assert.notEqual(schemaChangedDigest, schemaDigest);

  const recordChanged = snapshot([type, recordFile('r.md', 'note', 'one', 'Updated')]);
  const snapshotChanged = digest(computeGdHashV1(recordChanged, 'snapshot'));
  assert.notEqual(snapshotChanged, snapshotDigest);
  // Schema scope ignores record body change
  assert.equal(digest(computeGdHashV1(recordChanged, 'schema')), schemaDigest);
});

test('HASH-004: invalid hash scope fails with E_USAGE', () => {
  const type = typeFile('type.md', 'note');
  const result = computeGdHashV1(snapshot([type]), 'records');
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === 'E_USAGE'));
});

test('HASH-005: snapshot hash ignores blob store bytes', () => {
  const type = typeFile('type.md', 'note');
  const record = recordFile('r.md', 'note', 'one', 'Body');
  const blobDigest = 'a'.repeat(64);
  const blobPath = `blobs/sha256/${blobDigest.slice(0, 2)}/${blobDigest}`;
  const base = snapshot([type, record, [blobPath, encoder.encode('one')]]);
  const changedBlob = snapshot([type, record, [blobPath, encoder.encode('two')]]);

  const baseDigest = digest(computeGdHashV1(base, 'snapshot'));
  const changedDigest = digest(computeGdHashV1(changedBlob, 'snapshot'));
  assert.equal(baseDigest, changedDigest);
});

test('HASH-001: line ending normalization yields stable hashes', () => {
  const unix = typeFile('t.md', 'note');
  const windows = ['t.md', unix[1].replace(/\n/g, '\r\n')];
  const digestUnix = digest(computeGdHashV1(snapshot([unix]), 'schema'));
  const digestWindows = digest(computeGdHashV1(snapshot([windows]), 'schema'));
  assert.equal(digestUnix, digestWindows);
});

test('HASH-001: non-record files are ignored', () => {
  const type = typeFile('type.md', 'note');
  const base = digest(computeGdHashV1(snapshot([type]), 'schema'));
  const withReadme = digest(computeGdHashV1(snapshot([type, ['README.md', '# docs\n']]), 'schema'));
  assert.equal(base, withReadme);
});

test('HASH-001: duplicate identities fail hashing', () => {
  const typeA = typeFile('a.md', 'note');
  const typeB = typeFile('b.md', 'note');
  const result = computeGdHashV1(snapshot([typeA, typeB]), 'schema');
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === 'E_DUPLICATE_ID'));
});
