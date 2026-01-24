#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const { parseGraphMDFile, validateDatasetSnapshot } = require('@graphmd/dataset');

const REPO_ROOT = path.resolve(__dirname, '..');
const DATASET_ROOT = path.join(REPO_ROOT, 'spec-dataset');
const OUTPUT_PATH = path.join(REPO_ROOT, 'SPEC.md');

const DATASET_DIRS = ['types', 'records', 'blocks', 'plugins'];

function toPosix(filePath) {
  return filePath.split(path.sep).join('/');
}

function walkDir(rootDir, onFile) {
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  entries
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((entry) => {
      const fullPath = path.join(rootDir, entry.name);
      if (entry.isDirectory()) {
        walkDir(fullPath, onFile);
        return;
      }
      if (entry.isFile()) {
        onFile(fullPath);
      }
    });
}

function loadDatasetSnapshot(rootDir) {
  const files = new Map();

  DATASET_DIRS.forEach((dirName) => {
    const fullDir = path.join(rootDir, dirName);
    if (!fs.existsSync(fullDir)) return;
    walkDir(fullDir, (fullPath) => {
      const rel = toPosix(path.relative(rootDir, fullPath));
      files.set(rel, fs.readFileSync(fullPath));
    });
  });

  return { files };
}

function validateSnapshot(snapshot) {
  const result = validateDatasetSnapshot(snapshot);
  if (!result.ok) {
    console.error('Spec dataset validation failed:');
    console.error(JSON.stringify(result, null, 2));
    process.exit(1);
  }
}

function parseRecords(snapshot) {
  const records = [];

  for (const [file, bytes] of snapshot.files.entries()) {
    const parsed = parseGraphMDFile(file, bytes);
    if (parsed.kind === 'record') {
      records.push(parsed);
    }
  }

  return records;
}

function normalizeBody(body) {
  if (!body) return '';
  return body.replace(/^\n+/, '').replace(/\n+$/, '');
}

function parseNumericOrder(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function compareRecordsByOrder(a, b) {
  const orderA = parseNumericOrder(a.fields?.order);
  const orderB = parseNumericOrder(b.fields?.order);

  if (orderA !== null || orderB !== null) {
    const normalizedA = orderA ?? Number.POSITIVE_INFINITY;
    const normalizedB = orderB ?? Number.POSITIVE_INFINITY;
    if (normalizedA !== normalizedB) {
      return normalizedA - normalizedB;
    }
  }

  return a.recordId.localeCompare(b.recordId);
}

function renderRequirement(record) {
  if (!record.fields?.title || typeof record.fields.title !== 'string') {
    console.error(`Requirement ${record.identity} missing fields.title`);
    process.exit(1);
  }

  const title = record.fields.title;
  const attrs = [];
  if (typeof record.fields.testable === 'boolean') {
    attrs.push(`testable=${record.fields.testable}`);
  }
  if (typeof record.fields.verify === 'string' && record.fields.verify.trim()) {
    attrs.push(`verify=${record.fields.verify.trim()}`);
  }

  const escapedTitle = title.replace(/"/g, '\\"');
  const commentParts = [`req:id=${record.recordId}`, `title="${escapedTitle}"`];
  if (attrs.length > 0) {
    commentParts.push(...attrs);
  }

  const lines = [
    `<!-- ${commentParts.join(' ')} -->`,
    `### ${record.recordId} — ${title}`,
  ];

  const body = normalizeBody(record.body);
  if (body) {
    lines.push('', ...body.split('\n'));
  }

  return lines;
}

function renderSection(record, childrenByParent) {
  if (!record.fields?.title || typeof record.fields.title !== 'string') {
    console.error(`Section ${record.identity} missing fields.title`);
    process.exit(1);
  }

  const level = Number.isFinite(record.fields.level)
    ? record.fields.level
    : 2;
  const heading = `${'#'.repeat(level)} ${record.fields.title}`;
  const lines = [heading];

  const body = normalizeBody(record.body);
  if (body) {
    lines.push('', ...body.split('\n'));
  }

  const children = (childrenByParent.get(record.identity) ?? []).slice();
  children.sort(compareRecordsByOrder);
  children.forEach((child) => {
    lines.push('');
    lines.push(...renderRecord(child, childrenByParent));
  });

  return trimTrailingBlankLines(lines);
}

function renderRecord(record, childrenByParent) {
  if (record.typeId === 'section') {
    return renderSection(record, childrenByParent);
  }
  if (record.typeId === 'req') {
    return renderRequirement(record);
  }
  console.error(`Unsupported record type in spec dataset: ${record.identity}`);
  process.exit(1);
}

function trimTrailingBlankLines(lines) {
  const trimmed = [...lines];
  while (trimmed.length > 0 && trimmed[trimmed.length - 1] === '') {
    trimmed.pop();
  }
  return trimmed;
}

function buildSpecContent(records) {
  const specRecords = records.filter((record) => record.typeId === 'spec');
  if (specRecords.length !== 1) {
    console.error(
      `Expected exactly one spec record, found ${specRecords.length}.`,
    );
    process.exit(1);
  }

  const specRecord = specRecords[0];
  const specTitle = specRecord.fields?.title;
  if (!specTitle || typeof specTitle !== 'string') {
    console.error('Spec record missing fields.title');
    process.exit(1);
  }

  const lines = [`# ${specTitle}`, ''];

  const meta = [
    ['Spec Version', specRecord.fields?.version],
    ['Last Updated', specRecord.fields?.lastUpdated],
    ['Status', specRecord.fields?.status],
  ];

  meta.forEach(([label, value]) => {
    if (typeof value === 'string' && value.trim()) {
      lines.push(`**${label}:** ${value}`);
    }
  });

  const specBody = normalizeBody(specRecord.body);
  if (specBody) {
    lines.push('', ...specBody.split('\n'));
  }

  const recordsByIdentity = new Map(records.map((record) => [record.identity, record]));
  const childrenByParent = new Map();

  records.forEach((record) => {
    if (record.typeId === 'spec') return;
    const parent = record.parent;
    if (!parent) return;
    if (!recordsByIdentity.has(parent)) {
      console.error(`Record ${record.identity} references missing parent ${parent}`);
      process.exit(1);
    }
    if (!childrenByParent.has(parent)) {
      childrenByParent.set(parent, []);
    }
    childrenByParent.get(parent).push(record);
  });

  const topLevel = (childrenByParent.get(specRecord.identity) ?? []).slice();
  topLevel.sort(compareRecordsByOrder);

  topLevel.forEach((record) => {
    lines.push('');
    lines.push(...renderRecord(record, childrenByParent));
  });

  return trimTrailingBlankLines(lines).join('\n') + '\n';
}

function parseArgs() {
  const args = process.argv.slice(2);
  const checkIndex = args.indexOf('--check');
  return {
    check: checkIndex !== -1,
  };
}

function main() {
  const { check } = parseArgs();

  if (!fs.existsSync(DATASET_ROOT)) {
    console.error(`Spec dataset not found at ${DATASET_ROOT}`);
    process.exit(1);
  }

  const snapshot = loadDatasetSnapshot(DATASET_ROOT);
  validateSnapshot(snapshot);

  const records = parseRecords(snapshot);
  const output = buildSpecContent(records);

  if (check) {
    const existing = fs.existsSync(OUTPUT_PATH)
      ? fs.readFileSync(OUTPUT_PATH, 'utf8')
      : '';
    if (existing !== output) {
      console.error('SPEC.md is out of date. Run "npm run spec:compile" to regenerate.');
      process.exit(1);
    }
    return;
  }

  fs.writeFileSync(OUTPUT_PATH, output);
  console.log(`SPEC.md regenerated from ${path.relative(REPO_ROOT, DATASET_ROOT)}.`);
}

if (require.main === module) {
  main();
}
