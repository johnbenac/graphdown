const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { generateSpecTrace } = require('../tools/spec-trace.cjs');

test('GOV-002: spec-trace output matches committed matrix', () => {
  const repoRoot = path.resolve(__dirname, '..');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'spec-trace-'));
  let committed;
  let regenerated;

  try {
    const result = generateSpecTrace({ outputDir: tempDir, writeFiles: true, generatedAt: 'normalized' });
    regenerated = result.matrixData;
    committed = JSON.parse(fs.readFileSync(path.join(repoRoot, 'artifacts', 'spec-trace', 'matrix.json'), 'utf8'));
    committed.generatedAt = 'normalized';

    assert.deepStrictEqual(regenerated, committed);
  } catch (error) {
    const context = {
      committedRequirements: committed?.requirements?.length,
      regeneratedRequirements: regenerated?.requirements?.length,
      committedMissingTestable: committed?.missingTestable?.length,
      regeneratedMissingTestable: regenerated?.missingTestable?.length,
    };
    error.message = `spec-trace mismatch: ${error.message} | context=${JSON.stringify(context)}`;
    throw error;
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
