const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { buildGraphFromFs } = require('../dist/core');

const fixtureRoot = path.join(__dirname, 'fixtures', 'graph-dataset');

test('builds graph and answers outgoing links', () => {
  const result = buildGraphFromFs(fixtureRoot);

  assert.equal(result.ok, true);
  const { graph } = result;
  assert.deepEqual(graph.getLinksFrom('note:1'), ['note:2']);
  assert.deepEqual(graph.getLinksFrom('note:2'), ['note:1']);
});

test('answers incoming links', () => {
  const result = buildGraphFromFs(fixtureRoot);

  assert.equal(result.ok, true);
  const { graph } = result;
  assert.deepEqual(graph.getLinksTo('note:1'), ['note:2']);
  assert.deepEqual(graph.getLinksTo('note:2'), ['note:1']);
});

test('resolves type for record', () => {
  const result = buildGraphFromFs(fixtureRoot);

  assert.equal(result.ok, true);
  const { graph } = result;
  assert.equal(graph.getRecordTypeId('note:1'), 'note');
  const type = graph.getTypeForRecord('note:1');
  assert.ok(type);
  assert.equal(type.recordTypeId, 'note');
});

test('enforces global unique ids', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'graphdown-graph-'));

  try {
    fs.mkdirSync(path.join(tempDir, 'datasets'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'types'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'records', 'note'), { recursive: true });

    fs.writeFileSync(
      path.join(tempDir, 'datasets', 'dataset--demo.md'),
      `---
id: "dataset:demo"
datasetId: "dataset:demo"
typeId: "sys:dataset"
createdAt: "2024-01-01T00:00:00Z"
updatedAt: "2024-01-01T00:00:00Z"
fields:
  name: "Demo Dataset"
  description: "Dataset for graph tests."
---
`
    );

    fs.writeFileSync(
      path.join(tempDir, 'types', 'type--note.md'),
      `---
id: "type:note"
datasetId: "dataset:demo"
typeId: "sys:type"
createdAt: "2024-01-01T00:00:00Z"
updatedAt: "2024-01-01T00:00:00Z"
fields:
  recordTypeId: "note"
---
`
    );

    const recordContent = `---
id: "note:1"
datasetId: "dataset:demo"
typeId: "note"
createdAt: "2024-01-01T00:00:00Z"
updatedAt: "2024-01-01T00:00:00Z"
fields:
  title: "Duplicated"
---
`;
    fs.writeFileSync(path.join(tempDir, 'records', 'note', 'record--1.md'), recordContent);
    fs.writeFileSync(path.join(tempDir, 'records', 'note', 'record--2.md'), recordContent);

    const result = buildGraphFromFs(tempDir);

    assert.equal(result.ok, false);
    assert.ok(result.errors.some((error) => error.code === 'E_DUPLICATE_ID'));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('enforces stable recordTypeId format', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'graphdown-graph-'));

  try {
    fs.mkdirSync(path.join(tempDir, 'datasets'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'types'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'records', 'note'), { recursive: true });

    fs.writeFileSync(
      path.join(tempDir, 'datasets', 'dataset--demo.md'),
      `---
id: "dataset:demo"
datasetId: "dataset:demo"
typeId: "sys:dataset"
createdAt: "2024-01-01T00:00:00Z"
updatedAt: "2024-01-01T00:00:00Z"
fields:
  name: "Demo Dataset"
  description: "Dataset for graph tests."
---
`
    );

    fs.writeFileSync(
      path.join(tempDir, 'types', 'type--note.md'),
      `---
id: "type:note"
datasetId: "dataset:demo"
typeId: "sys:type"
createdAt: "2024-01-01T00:00:00Z"
updatedAt: "2024-01-01T00:00:00Z"
fields:
  recordTypeId: "Note Type"
---
`
    );

    fs.writeFileSync(
      path.join(tempDir, 'records', 'note', 'record--1.md'),
      `---
id: "note:1"
datasetId: "dataset:demo"
typeId: "note"
createdAt: "2024-01-01T00:00:00Z"
updatedAt: "2024-01-01T00:00:00Z"
fields:
  title: "First note"
---
`
    );

    const result = buildGraphFromFs(tempDir);

    assert.equal(result.ok, false);
    assert.ok(result.errors.some((error) => error.code === 'E_RECORD_TYPE_ID_INVALID'));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
