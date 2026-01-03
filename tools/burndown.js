#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

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

function buildMarkdown(matrix) {
  const testable = matrix.requirements.filter((r) => r.testable !== false);

  const total = testable.length;
  const covered = testable.filter((r) => r.tests.length > 0).length;
  const missing = testable.filter((r) => r.tests.length === 0);
  const coveragePct = ((covered / total) * 100).toFixed(1);

  const lines = [];
  lines.push('# Burndown: SPEC coverage snapshot');
  lines.push('');
  lines.push(`Generated: ${matrix.generatedAt ?? new Date().toISOString()}`);
  lines.push(`Source: artifacts/spec-trace/matrix.json`);
  lines.push('');
  lines.push(`- Requirements (testable): ${total}`);
  lines.push(`- Covered: ${covered}`);
  lines.push(`- Missing: ${missing.length}`);
  lines.push(`- Coverage: ${coveragePct}%`);
  lines.push('');

  if (missing.length === 0) {
    lines.push('All requirements have at least one referenced test. 🎉');
    return lines.join('\n');
  }

  lines.push('The following requirements currently have **no referenced tests**:');
  lines.push('');

  const grouped = groupByPrefix(missing);
  for (const [prefix, reqs] of grouped) {
    lines.push(`## ${prefix} (${reqs.length})`);
    for (const req of reqs) {
      lines.push(`- ${req.id} — ${req.title}`);
    }
    lines.push('');
  }

  lines.push('_Tip: add `testable=` / `verify=` metadata in SPEC.md when ready to gate coverage._');

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
