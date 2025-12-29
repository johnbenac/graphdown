const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { buildGraphFromFs } = require('../dist/core');

const fixturePath = path.join(__dirname, 'fixtures', 'graph-dataset');

test('builds graph and answers outgoing links', () => {
  const result = buildGraphFromFs(fixturePath);
  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }
  assert.deepEqual(result.graph.getLinksFrom('note:1'), ['note:2']);
  assert.deepEqual(result.graph.getLinksFrom('note:2'), ['note:1']);
});

test('answers incoming links', () => {
  const result = buildGraphFromFs(fixturePath);
  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }
  assert.deepEqual(result.graph.getLinksTo('note:1'), ['note:2']);
  assert.deepEqual(result.graph.getLinksTo('note:2'), ['note:1']);
});

test('resolves type for record', () => {
  const result = buildGraphFromFs(fixturePath);
  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }
  assert.equal(result.graph.getRecordTypeId('note:1'), 'note');
  const typeDef = result.graph.getTypeForRecord('note:1');
  assert.ok(typeDef);
  assert.equal(typeDef.recordTypeId, 'note');
});

test('enforces global unique IDs', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'graphdown-'));
  const datasetsDir = path.join(tempDir, 'datasets');
  const typesDir = path.join(tempDir, 'types');
  const recordsDir = path.join(tempDir, 'records', 'note');
  fs.mkdirSync(datasetsDir, { recursive: true });
  fs.mkdirSync(typesDir, { recursive: true });
  fs.mkdirSync(recordsDir, { recursive: true });

  fs.writeFileSync(
    path.join(datasetsDir, 'dataset--demo.md'),
    `---\n` +
      `id: "dataset:demo"\n` +
      `datasetId: "dataset:demo"\n` +
      `typeId: "sys:dataset"\n` +
      `createdAt: "2024-01-01T00:00:00Z"\n` +
      `updatedAt: "2024-01-01T00:00:00Z"\n` +
      `fields:\n` +
      `  name: "Demo Dataset"\n` +
      `  description: "desc"\n` +
      `---\n\n`
  );

  fs.writeFileSync(
    path.join(typesDir, 'type--note.md'),
    `---\n` +
      `id: "type:note"\n` +
      `datasetId: "dataset:demo"\n` +
      `typeId: "sys:type"\n` +
      `createdAt: "2024-01-01T00:00:00Z"\n` +
      `updatedAt: "2024-01-01T00:00:00Z"\n` +
      `fields:\n` +
      `  recordTypeId: "note"\n` +
      `---\n\n`
  );

  const recordContent =
    `---\n` +
    `id: "note:1"\n` +
    `datasetId: "dataset:demo"\n` +
    `typeId: "note"\n` +
    `createdAt: "2024-01-01T00:00:00Z"\n` +
    `updatedAt: "2024-01-01T00:00:00Z"\n` +
    `fields:\n` +
    `  title: "Note"\n` +
    `---\n\n`;

  fs.writeFileSync(path.join(recordsDir, 'record--1.md'), recordContent);
  fs.writeFileSync(path.join(recordsDir, 'record--2.md'), recordContent);

  const result = buildGraphFromFs(tempDir);
  assert.equal(result.ok, false);
  if (result.ok) {
    return;
  }
  assert.ok(result.errors.some((error) => error.code === 'E_DUPLICATE_ID'));
});

test('enforces stable recordTypeId format', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'graphdown-'));
  const datasetsDir = path.join(tempDir, 'datasets');
  const typesDir = path.join(tempDir, 'types');
  fs.mkdirSync(datasetsDir, { recursive: true });
  fs.mkdirSync(typesDir, { recursive: true });

  fs.writeFileSync(
    path.join(datasetsDir, 'dataset--demo.md'),
    `---\n` +
      `id: "dataset:demo"\n` +
      `datasetId: "dataset:demo"\n` +
      `typeId: "sys:dataset"\n` +
      `createdAt: "2024-01-01T00:00:00Z"\n` +
      `updatedAt: "2024-01-01T00:00:00Z"\n` +
      `fields:\n` +
      `  name: "Demo Dataset"\n` +
      `  description: "desc"\n` +
      `---\n\n`
  );

  fs.writeFileSync(
    path.join(typesDir, 'type--note.md'),
    `---\n` +
      `id: "type:note"\n` +
      `datasetId: "dataset:demo"\n` +
      `typeId: "sys:type"\n` +
      `createdAt: "2024-01-01T00:00:00Z"\n` +
      `updatedAt: "2024-01-01T00:00:00Z"\n` +
      `fields:\n` +
      `  recordTypeId: "Note Type"\n` +
      `---\n\n`
  );

  const result = buildGraphFromFs(tempDir);
  assert.equal(result.ok, false);
  if (result.ok) {
    return;
  }
  assert.ok(result.errors.some((error) => error.code === 'E_RECORD_TYPE_ID_INVALID'));
});
