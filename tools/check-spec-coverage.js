#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const MATRIX_PATH = path.join(REPO_ROOT, 'artifacts', 'spec-trace', 'matrix.json');

function loadMatrix() {
  if (!fs.existsSync(MATRIX_PATH)) {
    console.error(`Spec trace matrix not found at ${MATRIX_PATH}. Run "npm run spec:trace" first.`);
    process.exit(1);
  }
  const raw = fs.readFileSync(MATRIX_PATH, 'utf8');
  return JSON.parse(raw);
}

function main() {
  const matrix = loadMatrix();
  const missing = matrix.requirements.filter((req) => req.testable !== false && req.tests.length === 0);
  if (missing.length > 0) {
    console.error('Spec coverage check failed: testable requirements without tests:');
    for (const req of missing) {
      console.error(`- ${req.id} — ${req.title}`);
    }
    process.exit(1);
  }
  console.log('Spec coverage OK: all testable requirements have referenced tests.');
}

main();
