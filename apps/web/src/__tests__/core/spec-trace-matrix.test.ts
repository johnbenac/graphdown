import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { test } from "vitest";

// tools/spec-trace.cjs is CommonJS; load via createRequire
const require = createRequire(import.meta.url);
const { generateSpecTrace } = require("../../../../../tools/spec-trace.cjs");

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('GOV-002: spec-trace output matches committed matrix', () => {
  const repoRoot = path.resolve(__dirname, '../../../../../');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'spec-trace-'));
  let committed;
  let regenerated;
  let committedMd;
  let regeneratedMd;

  try {
    const result = generateSpecTrace({ outputDir: tempDir, writeFiles: true, generatedAt: 'normalized' });
    regenerated = result.matrixData;
    const baselinePath = path.join(repoRoot, 'artifacts', 'spec-trace', 'matrix.json');
    if (!fs.existsSync(baselinePath)) {
      throw new Error(
        'Baseline matrix artifact is missing. Run "npm run spec:trace" and commit artifacts/spec-trace/matrix.{json,md}.'
      );
    }
    const baselineMdPath = path.join(repoRoot, 'artifacts', 'spec-trace', 'matrix.md');
    if (!fs.existsSync(baselineMdPath)) {
      throw new Error(
        'Baseline matrix markdown is missing. Run "npm run spec:trace" and commit artifacts/spec-trace/matrix.{json,md}.'
      );
    }

    committed = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
    committed.generatedAt = 'normalized';

    committedMd = fs.readFileSync(baselineMdPath, 'utf8');
    regeneratedMd = fs.readFileSync(path.join(tempDir, 'matrix.md'), 'utf8');

    const normalizeMd = (text) => text.replace(/^Generated: .+$/m, 'Generated: normalized');

    assert.deepStrictEqual(regenerated, committed);
    assert.strictEqual(normalizeMd(regeneratedMd), normalizeMd(committedMd));
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
