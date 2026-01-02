const assert = require('node:assert/strict');
const test = require('node:test');
const { createHash } = require('node:crypto');

const { validateDatasetSnapshot, computeBlobDigest } = require('../dist/core');

const encoder = new TextEncoder();

function snapshot(entries) {
  return { files: new Map(entries.map(([path, content]) => [path, typeof content === 'string' ? encoder.encode(content) : content])) };
}

function record(path, yamlLines, body = '') {
  return [
    path,
    ['---', ...yamlLines, '---', body].join('\n')
  ];
}

function blobPathFor(digest) {
  return `blobs/sha256/${digest.slice(0, 2)}/${digest}`;
}

test('BLOB-001: computeBlobDigest hashes raw bytes', () => {
  const bytes = encoder.encode('abc');
  const expected = createHash('sha256').update(bytes).digest('hex');
  assert.equal(computeBlobDigest(bytes), expected);
});

test('VAL-BLOB-001: referenced blob must exist', () => {
  const blobBytes = encoder.encode('flower');
  const digest = createHash('sha256').update(blobBytes).digest('hex');
  const result = validateDatasetSnapshot(
    snapshot([
      record('types/photo.md', ['typeId: photo', 'fields: {}']),
      record('records/photo-1.md', ['typeId: photo', 'recordId: one', 'fields: {}'], `[[gdblob:sha256-${digest}]]`)
    ])
  );
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === 'E_BLOB_REFERENCE_MISSING'));
});

test('VAL-BLOB-002: blob bytes must match referenced digest', () => {
  const blobBytes = encoder.encode('flower');
  const digest = createHash('sha256').update(blobBytes).digest('hex');
  const badBytes = encoder.encode('flower2');
  const result = validateDatasetSnapshot(
    snapshot([
      record('types/photo.md', ['typeId: photo', 'fields: {}']),
      record('records/photo-1.md', ['typeId: photo', 'recordId: one', 'fields: {}'], `[[gdblob:sha256-${digest}]]`),
      [blobPathFor(digest), badBytes]
    ])
  );
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === 'E_BLOB_DIGEST_MISMATCH'));
});

test('BLOB-LAYOUT-002: invalid blob path shape fails validation', () => {
  const blobBytes = encoder.encode('flower');
  const digest = createHash('sha256').update(blobBytes).digest('hex');
  const result = validateDatasetSnapshot(
    snapshot([
      record('types/photo.md', ['typeId: photo', 'fields: {}']),
      record('records/photo-1.md', ['typeId: photo', 'recordId: one', 'fields: {}'], `[[gdblob:sha256-${digest}]]`),
      ['blobs/sha256/nothex/' + digest, blobBytes]
    ])
  );
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === 'E_BLOB_PATH_INVALID'));
});

test('BLOB-LAYOUT-001: canonical blob path is accepted', () => {
  const blobBytes = encoder.encode('rose');
  const digest = createHash('sha256').update(blobBytes).digest('hex');
  const result = validateDatasetSnapshot(
    snapshot([
      record('types/photo.md', ['typeId: photo', 'fields: {}']),
      record('records/photo-1.md', ['typeId: photo', 'recordId: one', 'fields: {}'], `[[gdblob:sha256-${digest}]]`),
      [blobPathFor(digest), blobBytes]
    ])
  );
  assert.equal(result.ok, true, JSON.stringify(result.errors));
});

test('BLOB-REF-001: split strings do not synthesize blob references', () => {
  const digest = 'a'.repeat(64);
  const result = validateDatasetSnapshot(
    snapshot([
      record('types/photo.md', ['typeId: photo', 'fields: {}']),
      record(
        'records/photo-1.md',
        [
          'typeId: photo',
          'recordId: one',
          'fields:',
          `  head: "[[gdblob:sha256-${digest.slice(0, 10)}"`,
          `  tail: "${digest.slice(10)}]]"`
        ]
      )
    ])
  );
  assert.equal(result.ok, true, JSON.stringify(result.errors));
});

test('GC-003: unreferenced but valid blobs do not fail validation', () => {
  const blobBytes = encoder.encode('tulip');
  const digest = createHash('sha256').update(blobBytes).digest('hex');
  const result = validateDatasetSnapshot(
    snapshot([
      record('types/photo.md', ['typeId: photo', 'fields: {}']),
      record('records/photo-1.md', ['typeId: photo', 'recordId: one', 'fields: {}']),
      [blobPathFor(digest), blobBytes]
    ])
  );
  assert.equal(result.ok, true, JSON.stringify(result.errors));
});

test('BLOB-LAYOUT-003: non-record, non-blob files are ignored by validation', () => {
  const result = validateDatasetSnapshot(
    snapshot([
      record('types/photo.md', ['typeId: photo', 'fields: {}']),
      record('records/photo-1.md', ['typeId: photo', 'recordId: one', 'fields: {}']),
      ['misc/data.bin', encoder.encode('bytes')]
    ])
  );
  assert.equal(result.ok, true, JSON.stringify(result.errors));
});
