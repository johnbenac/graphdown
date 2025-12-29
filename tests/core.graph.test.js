const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { buildGraphFromFs } = require('../dist/core');

const fixtureRoot = path.join(__dirname, 'fixtures', 'graph-dataset');

test('buildGraphFromFs builds a graph with outgoing links', () => {
  const result = buildGraphFromFs(fixtureRoot);
  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }
  const { graph } = result;
  assert.deepEqual(graph.getLinksFrom('note:1'), ['note:2']);
  assert.deepEqual(graph.getLinksFrom('note:2'), ['note:1']);
});

test('buildGraphFromFs answers incoming links', () => {
  const result = buildGraphFromFs(fixtureRoot);
  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }
  const { graph } = result;
  assert.deepEqual(graph.getLinksTo('note:1'), ['note:2']);
  assert.deepEqual(graph.getLinksTo('note:2'), ['note:1']);
});

test('buildGraphFromFs resolves type for record', () => {
  const result = buildGraphFromFs(fixtureRoot);
  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }
  const { graph } = result;
  assert.equal(graph.getRecordTypeId('note:1'), 'note');
  const type = graph.getTypeForRecord('note:1');
  assert.ok(type);
  assert.equal(type.recordTypeId, 'note');
});

test('buildGraphFromFs enforces duplicate ids', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'graphdown-dup-'));
  const datasetDir = path.join(tmpDir, 'datasets');
  const typesDir = path.join(tmpDir, 'types');
  const recordsDir = path.join(tmpDir, 'records', 'note');
  fs.mkdirSync(datasetDir, { recursive: true });
  fs.mkdirSync(typesDir, { recursive: true });
  fs.mkdirSync(recordsDir, { recursive: true });
  fs.writeFileSync(
    path.join(datasetDir, 'dataset--demo.md'),
    fs.readFileSync(path.join(fixtureRoot, 'datasets', 'dataset--demo.md'))
  );
  fs.writeFileSync(
    path.join(typesDir, 'type--note.md'),
    fs.readFileSync(path.join(fixtureRoot, 'types', 'type--note.md'))
  );
  const record = fs.readFileSync(
    path.join(fixtureRoot, 'records', 'note', 'record--1.md')
  );
  fs.writeFileSync(path.join(recordsDir, 'record--1.md'), record);
  fs.writeFileSync(path.join(recordsDir, 'record--2.md'), record);

  const result = buildGraphFromFs(tmpDir);
  assert.equal(result.ok, false);
  if (result.ok) {
    return;
  }
  assert.ok(result.errors.some((error) => error.code === 'E_DUPLICATE_ID'));
});

test('buildGraphFromFs enforces recordTypeId format', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'graphdown-type-'));
  const datasetDir = path.join(tmpDir, 'datasets');
  const typesDir = path.join(tmpDir, 'types');
  const recordsDir = path.join(tmpDir, 'records', 'note');
  fs.mkdirSync(datasetDir, { recursive: true });
  fs.mkdirSync(typesDir, { recursive: true });
  fs.mkdirSync(recordsDir, { recursive: true });
  fs.writeFileSync(
    path.join(datasetDir, 'dataset--demo.md'),
    fs.readFileSync(path.join(fixtureRoot, 'datasets', 'dataset--demo.md'))
  );
  const invalidType = fs
    .readFileSync(path.join(fixtureRoot, 'types', 'type--note.md'))
    .toString('utf8')
    .replace('recordTypeId: "note"', 'recordTypeId: "Note Type"');
  fs.writeFileSync(path.join(typesDir, 'type--note.md'), invalidType);

  const result = buildGraphFromFs(tmpDir);
  assert.equal(result.ok, false);
  if (result.ok) {
    return;
  }
  assert.ok(
    result.errors.some((error) => error.code === 'E_RECORD_TYPE_ID_INVALID')
  );
});
