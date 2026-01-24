#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const {
  discoverGraphMDObjects,
  validateDatasetSnapshot,
} = require('@graphmd/dataset');

const REPO_ROOT = path.resolve(__dirname, '..');
const SPEC_DATASET_ROOT = path.join(REPO_ROOT, 'spec-dataset');
const SPEC_OUTPUT_PATH = path.join(REPO_ROOT, 'SPEC.md');

const DATASET_DIRS = ['types', 'records', 'blocks', 'plugins'];

function toPosixPath(filePath) {
  return filePath.split(path.sep).join('/');
}

function collectFiles(root) {
  const files = new Map();

  for (const dir of DATASET_DIRS) {
    const absoluteDir = path.join(root, dir);
    if (!fs.existsSync(absoluteDir)) continue;
    const walk = (current) => {
      const entries = fs.readdirSync(current, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(current, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.isFile()) {
          const relPath = toPosixPath(path.relative(root, fullPath));
          files.set(relPath, new Uint8Array(fs.readFileSync(fullPath)));
        }
      }
    };
    walk(absoluteDir);
  }

  return { files };
}

function formatValidationErrors(errors) {
  return errors
    .map((error) => {
      const location = error.file ? ` (${error.file})` : '';
      return `- ${error.code}: ${error.message}${location}`;
    })
    .join('\n');
}

function getOrderValue(record) {
  const raw = record.fields?.order;
  if (raw === undefined || raw === null) return null;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const parsed = Number.parseFloat(raw);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return null;
}

function sortChildren(records) {
  return [...records].sort((a, b) => {
    const aOrder = getOrderValue(a);
    const bOrder = getOrderValue(b);
    if (aOrder !== null && bOrder !== null) {
      if (aOrder !== bOrder) return aOrder - bOrder;
    } else if (aOrder !== null) {
      return -1;
    } else if (bOrder !== null) {
      return 1;
    }
    return a.recordId.localeCompare(b.recordId);
  });
}

function buildTree(records) {
  const recordMap = new Map();
  records.forEach((record) => {
    recordMap.set(`${record.typeId}:${record.recordId}`, record);
  });

  const children = new Map();
  records.forEach((record) => {
    if (!record.parent) return;
    if (!children.has(record.parent)) children.set(record.parent, []);
    children.get(record.parent).push(record);
  });

  return { recordMap, children };
}

function appendBody(lines, body) {
  if (!body) return;
  lines.push(...body.split('\n'));
}

function stripLeadingBlankLine(body) {
  if (!body) return body;
  const parts = body.split('\n');
  if (parts.length === 0) return body;
  if (parts[0].trim() === '') {
    parts.shift();
  }
  return parts.join('\n');
}

function ensureBlankLine(lines) {
  if (lines.length === 0) return;
  if (lines[lines.length - 1].trim() !== '') {
    lines.push('');
  }
}

function renderSection(record, childrenMap, lines) {
  const levelRaw = record.fields?.level;
  const level = Number.isFinite(Number(levelRaw)) ? Number(levelRaw) : 2;
  const hashes = '#'.repeat(Math.min(Math.max(level, 2), 6));
  ensureBlankLine(lines);
  lines.push(`${hashes} ${record.fields.title}`);
  lines.push('');
  appendBody(lines, stripLeadingBlankLine(record.body));

  const childRecords = sortChildren(childrenMap.get(record.identity) ?? []);
  childRecords.forEach((child) => {
    renderRecord(child, childrenMap, lines);
  });
}

function renderRequirement(record, lines) {
  const fields = record.fields ?? {};
  const attrs = [];
  if (fields.testable !== undefined) {
    attrs.push(`testable=${fields.testable}`);
  }
  if (fields.verify !== undefined && fields.verify !== null && fields.verify !== '') {
    attrs.push(`verify=${fields.verify}`);
  }

  const attrText = attrs.length > 0 ? ` ${attrs.join(' ')}` : '';
  const headingTitle = fields.headingTitle || fields.title;
  const commentGap = Number.isFinite(Number(fields.commentGap))
    ? Number(fields.commentGap)
    : 0;
  ensureBlankLine(lines);
  lines.push(`<!-- req:id=${record.recordId} title="${fields.title}"${attrText} -->`);
  if (commentGap > 0) {
    for (let i = 0; i < commentGap; i += 1) {
      lines.push('');
    }
  }
  lines.push(`### ${record.recordId} — ${headingTitle}`);
  lines.push('');
  appendBody(lines, stripLeadingBlankLine(record.body));
}

function renderRecord(record, childrenMap, lines) {
  if (record.typeId === 'section') {
    renderSection(record, childrenMap, lines);
    return;
  }
  if (record.typeId === 'req') {
    renderRequirement(record, lines);
    return;
  }
  throw new Error(`Unhandled record type ${record.typeId} (${record.recordId})`);
}

function buildSpec(records) {
  const { recordMap, children } = buildTree(records);
  const specRecord = records.find((record) => record.typeId === 'spec');
  if (!specRecord) {
    throw new Error('No spec record found in spec dataset');
  }
  if (records.filter((record) => record.typeId === 'spec').length > 1) {
    throw new Error('Multiple spec records found in spec dataset');
  }

  const lines = [];
  lines.push('');
  lines.push(`# ${specRecord.fields.title}`);
  lines.push('');
  if (specRecord.fields.version) {
    lines.push(`**Spec Version:** ${specRecord.fields.version}`);
  }
  if (specRecord.fields.lastUpdated) {
    lines.push(`**Last Updated:** ${specRecord.fields.lastUpdated}`);
  }
  if (specRecord.fields.status) {
    lines.push(`**Status:** ${specRecord.fields.status}`);
  }
  lines.push('');
  appendBody(lines, stripLeadingBlankLine(specRecord.body));
  ensureBlankLine(lines);

  const rootChildren = sortChildren(children.get(specRecord.identity) ?? []);
  rootChildren.forEach((record) => renderRecord(record, children, lines));

  while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
    lines.pop();
  }
  lines.push('');

  return lines.join('\n');
}

function main() {
  const snapshot = collectFiles(SPEC_DATASET_ROOT);
  const validation = validateDatasetSnapshot(snapshot);
  if (!validation.ok) {
    console.error('Spec dataset validation failed:');
    console.error(formatValidationErrors(validation.errors));
    process.exit(1);
  }

  const parsed = discoverGraphMDObjects(snapshot);
  if (parsed.errors.length > 0) {
    console.error('Spec dataset parsing failed:');
    console.error(formatValidationErrors(parsed.errors));
    process.exit(1);
  }

  const output = buildSpec(parsed.recordObjects);
  fs.writeFileSync(SPEC_OUTPUT_PATH, output);
  console.log(`SPEC.md compiled from spec-dataset to ${path.relative(REPO_ROOT, SPEC_OUTPUT_PATH)}`);
}

if (require.main === module) {
  main();
}
