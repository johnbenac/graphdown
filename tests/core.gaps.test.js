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

test('NR-LINK-001: missing record links are allowed (except composition)', () => {
  const result = validateDatasetSnapshot(
    snapshot([
      record('types/note.md', ['typeId: note', 'fields: {}']),
      record('records/note-1.md', ['typeId: note', 'recordId: one', 'fields: {}'], 'See [[note:missing]].')
    ])
  );
  assert.equal(result.ok, true, JSON.stringify(result.errors));
});

test('TYPE-004 + VAL-005: fieldDefs map enforces required=true only', () => {
  const type = record('types/task.md', ['typeId: task', 'fields:', '  fieldDefs:', '    title:', '      required: true']);
  const missing = record('records/task-1.md', ['typeId: task', 'recordId: t1', 'fields: {}']);
  const present = record('records/task-2.md', ['typeId: task', 'recordId: t2', 'fields:', '  title: Hi']);

  const failResult = validateDatasetSnapshot(snapshot([type, missing]));
  assert.equal(failResult.ok, false);
  assert.ok(failResult.errors.some((e) => e.code === 'E_REQUIRED_FIELD_MISSING'));

  const passResult = validateDatasetSnapshot(snapshot([type, present]));
  assert.equal(passResult.ok, true, JSON.stringify(passResult.errors));
});

test('TYPE-004: fieldDefs must be map of objects; required must be boolean when present', () => {
  const invalid = record('types/task.md', ['typeId: task', 'fields:', '  fieldDefs:', '    title: 123']);
  const invalidRequired = record(
    'types/flag.md',
    ['typeId: flag', 'fields:', '  fieldDefs:', '    on:', '      required: "yes"']
  );

  const result = validateDatasetSnapshot(snapshot([invalid]));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === 'E_REQUIRED_FIELD_MISSING'));

  const result2 = validateDatasetSnapshot(snapshot([invalidRequired]));
  assert.equal(result2.ok, false);
  assert.ok(result2.errors.some((e) => e.code === 'E_REQUIRED_FIELD_MISSING'));
});

test('NR-SEM-001: semantic shapes are ignored by validation', () => {
  const type = record(
    'types/flag.md',
    ['typeId: flag', 'fields:', '  fieldDefs:', '    enabled:', '      required: true', '      kind: boolean']
  );
  const recordNonBool = record('records/flag-1.md', ['typeId: flag', 'recordId: one', 'fields:', '  enabled: "not bool"']);
  const result = validateDatasetSnapshot(snapshot([type, recordNonBool]));
  assert.equal(result.ok, true, JSON.stringify(result.errors));
});

test('NR-UI-002: arbitrary keys inside fields are accepted', () => {
  const type = record('types/note.md', ['typeId: note', 'fields: {}']);
  const rec = record(
    'records/note-1.md',
    ['typeId: note', 'recordId: one', 'fields:', '  title: Note', '  ui:', '    widget: textarea']
  );
  const result = validateDatasetSnapshot(snapshot([type, rec]));
  assert.equal(result.ok, true, JSON.stringify(result.errors));
});
