#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const { parseGraphMDFile, validateDatasetSnapshot } = require('@graphmd/dataset');

const REPO_ROOT = path.resolve(__dirname, '..');
const SPEC_DATASET_ROOT = path.join(REPO_ROOT, 'spec-dataset');
const OUTPUT_PATH = path.join(REPO_ROOT, 'SPEC.md');

const ALLOWED_DATASET_DIRS = new Set(['types', 'records', 'blocks', 'plugins']);

function toPosix(filePath) {
  return filePath.split(path.sep).join('/');
}

function loadDatasetSnapshotFromFs(root) {
  if (!fs.existsSync(root)) {
    throw new Error(`spec dataset root not found at ${root}`);
  }

  const topEntries = fs.readdirSync(root, { withFileTypes: true });
  for (const entry of topEntries) {
    if (!entry.isDirectory()) {
      throw new Error(
        `Unexpected file in spec dataset root: ${entry.name}. Only directories are allowed.`,
      );
    }
    if (!ALLOWED_DATASET_DIRS.has(entry.name)) {
      throw new Error(
        `Unexpected directory in spec dataset root: ${entry.name}. Allowed: ${[...ALLOWED_DATASET_DIRS].join(', ')}`,
      );
    }
  }

  const files = new Map();

  const walk = (dir, relBase) => {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === '.git') continue;
      const fullPath = path.join(dir, entry.name);
      const relPath = path.join(relBase, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath, relPath);
      } else if (entry.isFile()) {
        files.set(toPosix(relPath), fs.readFileSync(fullPath));
      }
    }
  };

  for (const dirName of ALLOWED_DATASET_DIRS) {
    walk(path.join(root, dirName), dirName);
  }

  return { files };
}

function validateSnapshotOrExit(snapshot) {
  const result = validateDatasetSnapshot(snapshot);
  if (result.ok) return;
  console.error('Spec dataset validation failed:');
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

function parseRecords(snapshot) {
  const records = [];

  for (const [filePath, bytes] of snapshot.files.entries()) {
    const parsed = parseGraphMDFile(filePath, bytes);
    if (parsed.kind === 'record') {
      records.push(parsed);
    }
  }

  return records;
}

function getOrderValue(fields) {
  if (!fields || fields.order === undefined || fields.order === null) return null;
  const num = Number(fields.order);
  if (!Number.isFinite(num)) return null;
  return num;
}

function sortByOrderThenId(a, b) {
  const orderA = getOrderValue(a.fields);
  const orderB = getOrderValue(b.fields);

  if (orderA !== null && orderB !== null) {
    if (orderA !== orderB) return orderA - orderB;
  } else if (orderA !== null) {
    return -1;
  } else if (orderB !== null) {
    return 1;
  }

  return a.recordId.localeCompare(b.recordId);
}

function renderRequirement(record) {
  const attrs = [];
  if (record.fields.testable !== undefined) {
    attrs.push(`testable=${record.fields.testable}`);
  }
  if (record.fields.verify) {
    attrs.push(`verify=${record.fields.verify}`);
  }
  const attrSuffix = attrs.length > 0 ? ` ${attrs.join(' ')}` : '';
  const comment = `<!-- req:id=${record.recordId} title="${record.fields.title}"${attrSuffix} -->`;
  const headingTitle = record.fields.heading ?? record.fields.title;
  const heading = `### ${record.recordId} — ${headingTitle}`;
  const body = String(record.body ?? '').replace(/^\n+/, '').trimEnd();
  if (!body) {
    return `${comment}\n${heading}`;
  }
  return `${comment}\n${heading}\n\n${body}`;
}

function renderSection(record, children, renderNode) {
  const levelRaw = record.fields.level;
  const levelNum = Number(levelRaw);
  const level = Number.isFinite(levelNum) ? Math.min(Math.max(levelNum, 2), 6) : 2;
  const heading = `${'#'.repeat(level)} ${record.fields.title}`;
  const body = String(record.body ?? '').replace(/^\n+/, '').trimEnd();
  const blocks = [];
  if (body) {
    blocks.push(`${heading}\n\n${body}`);
  } else {
    blocks.push(heading);
  }

  for (const child of children) {
    blocks.push(renderNode(child));
  }

  return blocks.join('\n\n');
}

function compileSpec() {
  const snapshot = loadDatasetSnapshotFromFs(SPEC_DATASET_ROOT);
  validateSnapshotOrExit(snapshot);

  const records = parseRecords(snapshot);
  const recordById = new Map(records.map((record) => [record.identity, record]));
  const specRecords = records.filter((record) => record.typeId === 'spec');

  if (specRecords.length !== 1) {
    console.error(`Expected exactly one spec record, found ${specRecords.length}.`);
    process.exit(1);
  }

  const specRecord = specRecords[0];
  if (specRecord.parent && specRecord.parent !== null) {
    console.error('Spec record must not declare a parent.');
    process.exit(1);
  }

  const childrenByParent = new Map();
  for (const record of records) {
    if (!record.parent) continue;
    if (!childrenByParent.has(record.parent)) {
      childrenByParent.set(record.parent, []);
    }
    childrenByParent.get(record.parent).push(record);
  }

  for (const [, children] of childrenByParent.entries()) {
    children.sort(sortByOrderThenId);
  }

  const renderNode = (record) => {
    const children = childrenByParent.get(record.identity) ?? [];
    if (record.typeId === 'req') {
      return renderRequirement(record);
    }
    if (record.typeId === 'section') {
      return renderSection(record, children, renderNode);
    }
    return '';
  };

  const headerLines = [];
  headerLines.push(`# ${specRecord.fields.title}`);
  headerLines.push('');
  if (specRecord.fields.version) {
    headerLines.push(`**Spec Version:** ${specRecord.fields.version}`);
  }
  if (specRecord.fields.lastUpdated) {
    headerLines.push(`**Last Updated:** ${specRecord.fields.lastUpdated}`);
  }
  if (specRecord.fields.status) {
    headerLines.push(`**Status:** ${specRecord.fields.status}`);
  }

  const specBody = String(specRecord.body ?? '').replace(/^\n+/, '').trimEnd();
  const blocks = [];
  blocks.push(headerLines.join('\n'));
  if (specBody) {
    blocks.push(specBody);
  }

  const topChildren = childrenByParent.get(specRecord.identity) ?? [];
  for (const child of topChildren) {
    blocks.push(renderNode(child));
  }

  const output = `\n${blocks.join('\n\n').trimEnd()}\n`;
  fs.writeFileSync(OUTPUT_PATH, output);
  console.log(`SPEC.md written from ${path.relative(REPO_ROOT, SPEC_DATASET_ROOT)}.`);
}

if (require.main === module) {
  compileSpec();
}

module.exports = { compileSpec };
