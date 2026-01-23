#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const root = process.cwd();
const legacyTerm = ['graph', 'down'].join('').toLowerCase();
const skipPrefixes = ['node_modules/', '.git/'];

function listFiles() {
  try {
    return execSync('git ls-files', { encoding: 'utf8' })
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  } catch (error) {
    console.warn('git ls-files failed; falling back to filesystem walk:', error.message);
    return walk(root).map((file) => path.relative(root, file));
  }
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') {
        continue;
      }
      results.push(...walk(rel));
      continue;
    }
    if (entry.isFile()) {
      results.push(rel);
    }
  }
  return results;
}

function hasLegacyTerm(filePath) {
  const contents = fs.readFileSync(filePath);
  const text = contents.toString('utf8').toLowerCase();
  return text.includes(legacyTerm);
}

function isSkipped(file) {
  return skipPrefixes.some((prefix) => file.startsWith(prefix));
}

const files = listFiles().filter((file) => !isSkipped(file));
const offenders = [];

for (const file of files) {
  const absolute = path.join(root, file);
  if (!fs.existsSync(absolute)) {
    continue;
  }
  if (hasLegacyTerm(absolute)) {
    offenders.push(file);
  }
}

if (offenders.length > 0) {
  console.error('Legacy brand string detected in repository files:');
  for (const file of offenders) {
    console.error(`- ${file}`);
  }
  process.exit(1);
}

console.log('Legacy brand check: ok');
