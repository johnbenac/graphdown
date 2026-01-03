const assert = require('node:assert/strict');
const test = require('node:test');

const { validateDatasetSnapshot } = require('../dist/core');

const encoder = new TextEncoder();

function snapshot(entries) {
  return { files: new Map(entries.map(([path, content]) => [path, encoder.encode(content)])) };
}

function record(path, yamlLines, body = '') {
  return [
    path,
    ['---', ...yamlLines, '---', body].join('\n')
  ];
}

test('VAL-COMP-002: required component link resolves to correct type', () => {
  const result = validateDatasetSnapshot(
    snapshot([
      record('any/engine.md', ['typeId: engine', 'fields: {}']),
      record('any/car.md', ['typeId: car', 'fields:', '  composition:', '    engine:', '      typeId: engine', '      required: true']),
      record('records/engine/e1.md', ['typeId: engine', 'recordId: e1', 'fields: {}']),
      record('records/car/c1.md', ['typeId: car', 'recordId: c1', 'fields: {}'], 'Has [[engine:e1]].')
    ])
  );
  assert.equal(result.ok, true);
});

test('VAL-COMP-002: missing required component link fails', () => {
  const result = validateDatasetSnapshot(
    snapshot([
      record('types/engine.md', ['typeId: engine', 'fields: {}']),
      record('types/car.md', ['typeId: car', 'fields:', '  composition:', '    engine:', '      typeId: engine', '      required: true']),
      record('records/car/c1.md', ['typeId: car', 'recordId: c1', 'fields: {}'], 'No links here.')
    ])
  );
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === 'E_COMPOSITION_CONSTRAINT_VIOLATION'));
});

test('VAL-COMP-002: link to wrong type does not satisfy requirement', () => {
  const result = validateDatasetSnapshot(
    snapshot([
      record('types/engine.md', ['typeId: engine', 'fields: {}']),
      record('types/car.md', ['typeId: car', 'fields:', '  composition:', '    engine:', '      typeId: engine', '      required: true']),
      record('records/car/c1.md', ['typeId: car', 'recordId: c1', 'fields: {}'], 'Points to [[car:self]]')
    ])
  );
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === 'E_COMPOSITION_CONSTRAINT_VIOLATION'));
});

test('VAL-COMP-001: composition referenced types must exist', () => {
  const result = validateDatasetSnapshot(
    snapshot([
      record('types/car.md', ['typeId: car', 'fields:', '  composition:', '    engine:', '      typeId: engine', '      required: true']),
      record('records/car/c1.md', ['typeId: car', 'recordId: c1', 'fields: {}'])
    ])
  );
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === 'E_COMPOSITION_UNKNOWN_TYPE'));
});

test('TYPE-COMP-001: composition must be a map with only typeId + required', () => {
  const invalid = validateDatasetSnapshot(
    snapshot([
      record('types/car.md', ['typeId: car', 'fields:', '  composition: []'])
    ])
  );
  assert.equal(invalid.ok, false);
  assert.ok(invalid.errors.some((e) => e.code === 'E_COMPOSITION_SCHEMA_INVALID'));

  const extraKey = validateDatasetSnapshot(
    snapshot([
      record(
        'types/car.md',
        ['typeId: car', 'fields:', '  composition:', '    engine:', '      typeId: engine', '      required: true', '      max: 2']
      )
    ])
  );
  assert.equal(extraKey.ok, false);
  assert.ok(extraKey.errors.some((e) => e.code === 'E_COMPOSITION_SCHEMA_INVALID'));
});

test('TYPE-COMP-001: composition component must include required boolean', () => {
  const missingRequired = validateDatasetSnapshot(
    snapshot([
      record('types/car.md', ['typeId: car', 'fields:', '  composition:', '    engine:', '      typeId: engine'])
    ])
  );
  assert.equal(missingRequired.ok, false);
  assert.ok(missingRequired.errors.some((e) => e.code === 'E_COMPOSITION_SCHEMA_INVALID'));
});
