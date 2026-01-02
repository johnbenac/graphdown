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

test('VAL-BLOB-001/002: blob reference must exist and match digest', () => {
  const blobBytes = encoder.encode('flower');
  const digest = createHash('sha256').update(blobBytes).digest('hex');
  const goodBlob = [blobPathFor(digest), blobBytes];
  const result = validateDatasetSnapshot(
    snapshot([
      record('types/photo.md', ['typeId: photo', 'fields: {}']),
      record('records/photo-1.md', ['typeId: photo', 'recordId: one', 'fields: {}'], `[[gdblob:sha256-${digest}]]`),
      goodBlob
    ])
  );
  assert.equal(result.ok, true, JSON.stringify(result.errors));

  const missing = validateDatasetSnapshot(
    snapshot([
      record('types/photo.md', ['typeId: photo', 'fields: {}']),
      record('records/photo-1.md', ['typeId: photo', 'recordId: one', 'fields: {}'], `[[gdblob:sha256-${digest}]]`)
    ])
  );
  assert.equal(missing.ok, false);
  assert.ok(missing.errors.some((e) => e.code === 'E_BLOB_REFERENCE_MISSING'));

  const badBytes = encoder.encode('flower2');
  const mismatch = validateDatasetSnapshot(
    snapshot([
      record('types/photo.md', ['typeId: photo', 'fields: {}']),
      record('records/photo-1.md', ['typeId: photo', 'recordId: one', 'fields: {}'], `[[gdblob:sha256-${digest}]]`),
      [blobPathFor(digest), badBytes]
    ])
  );
  assert.equal(mismatch.ok, false);
  assert.ok(mismatch.errors.some((e) => e.code === 'E_BLOB_DIGEST_MISMATCH'));
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
