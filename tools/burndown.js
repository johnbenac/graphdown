#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const {
  DEFAULT_DEFERRED_VERIFY,
  classifyRequirements,
} = require('./spec-verify-policy.cjs');

const REPO_ROOT = path.resolve(__dirname, '..');
const MATRIX_PATH = path.join(REPO_ROOT, 'artifacts', 'spec-trace', 'matrix.json');
const OUTPUT_PATH = path.join(REPO_ROOT, 'artifacts', 'spec-trace', 'burndown.md');
const NON_TESTABLE_OUTPUT_PATH = path.join(REPO_ROOT, 'artifacts', 'spec-trace', 'non-testable.md');

function loadMatrix(matrixPath) {
  if (!fs.existsSync(matrixPath)) {
    console.error(`Spec trace matrix not found at ${matrixPath}. Run "npm run spec:trace" first.`);
    process.exit(1);
  }
  const raw = fs.readFileSync(matrixPath, 'utf8');
  return JSON.parse(raw);
}

function groupByPrefix(requirements) {
  const groups = new Map();
  for (const req of requirements) {
    const prefix = req.id.split('-')[0];
    if (!groups.has(prefix)) {
      groups.set(prefix, []);
    }
    groups.get(prefix).push(req);
  }
  for (const [, reqs] of groups) {
    reqs.sort((a, b) => a.id.localeCompare(b.id));
  }
  return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

function pct(numerator, denominator) {
  if (denominator === 0) return '100.0';
  return ((numerator / denominator) * 100).toFixed(1);
}

function buildMarkdown(matrix) {
  const { testable, enforced, deferred } = classifyRequirements(matrix.requirements);

  const enforcedMissing = enforced.filter((r) => r.tests.length === 0);
  const deferredMissing = deferred.filter((r) => r.tests.length === 0);

  const enforcedCovered = enforced.length - enforcedMissing.length;
  const deferredCovered = deferred.length - deferredMissing.length;

  const testableCovered = testable.filter((r) => r.tests.length > 0).length;
  const testableMissing = testable.filter((r) => r.tests.length === 0);

  const lines = [];
  lines.push('# Burndown: SPEC coverage snapshot');
  lines.push('');
  lines.push(`Generated: ${matrix.generatedAt ?? new Date().toISOString()}`);
  lines.push('Source: artifacts/spec-trace/matrix.json');
  lines.push('');

  lines.push('## Enforced coverage (CI gate)');
  lines.push(`- Requirements: ${enforced.length}`);
  lines.push(`- Covered: ${enforcedCovered}`);
  lines.push(`- Missing: ${enforcedMissing.length}`);
  lines.push(`- Coverage: ${pct(enforcedCovered, enforced.length)}%`);
  lines.push('');

  lines.push(`## Deferred backlog (verify in: ${DEFAULT_DEFERRED_VERIFY.join(', ')})`);
  lines.push(`- Requirements: ${deferred.length}`);
  lines.push(`- Covered: ${deferredCovered}`);
  lines.push(`- Missing: ${deferredMissing.length}`);
  lines.push(`- Coverage: ${pct(deferredCovered, deferred.length)}%`);
  lines.push('');

  lines.push('## Overall (all testable requirements)');
  lines.push(`- Requirements: ${testable.length}`);
  lines.push(`- Covered: ${testableCovered}`);
  lines.push(`- Missing: ${testableMissing.length}`);
  lines.push(`- Coverage: ${pct(testableCovered, testable.length)}%`);
  lines.push('');

  if (enforcedMissing.length === 0 && deferredMissing.length === 0) {
    lines.push('All requirements have at least one referenced test. 🎉');
    return lines.join('\n');
  }

  if (enforcedMissing.length > 0) {
    lines.push('The following ENFORCED requirements have **no referenced tests** (CI will fail):');
    lines.push('');
    const grouped = groupByPrefix(enforcedMissing);
    for (const [prefix, reqs] of grouped) {
      lines.push(`### ${prefix} (${reqs.length})`);
      for (const req of reqs) {
        lines.push(`- ${req.id} — ${req.title}`);
      }
      lines.push('');
    }
  }

  if (deferredMissing.length > 0) {
    lines.push('The following DEFERRED requirements have **no referenced tests** (CI does NOT fail):');
    lines.push('');
    const grouped = groupByPrefix(deferredMissing);
    for (const [prefix, reqs] of grouped) {
      lines.push(`### ${prefix} (${reqs.length})`);
      for (const req of reqs) {
        lines.push(`- ${req.id} — ${req.title}`);
      }
      lines.push('');
    }
  }

  lines.push(
    '_Rule: use `verify=todo` on a requirement when it is not implemented/verified yet. Promotion = remove `verify=todo` (or set `verify=ci`) + add at least one test title prefixed with the req ID._',
  );

  return lines.join('\n');
}

function buildNonTestableMarkdown(matrix) {
  const nonTestable = matrix.requirements.filter((r) => r.testable === false);
  const lines = [];
  lines.push('# Non-testable requirements');
  lines.push('');
  lines.push('These governance/process requirements are marked `testable=false` and are excluded from coverage.');
  lines.push('');
  if (nonTestable.length === 0) {
    lines.push('- (none)');
    return lines.join('\n');
  }

  const grouped = groupByPrefix(nonTestable);
  for (const [prefix, reqs] of grouped) {
    lines.push(`## ${prefix} (${reqs.length})`);
    for (const req of reqs) {
      lines.push(`- ${req.id} — ${req.title}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function main() {
  const matrix = loadMatrix(MATRIX_PATH);
  const markdown = buildMarkdown(matrix);
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${markdown}\n`);
  const nonTestable = buildNonTestableMarkdown(matrix);
  fs.mkdirSync(path.dirname(NON_TESTABLE_OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(NON_TESTABLE_OUTPUT_PATH, `${nonTestable}\n`);
  console.log(`Burndown written to ${path.relative(REPO_ROOT, OUTPUT_PATH)}`);
}

main();
