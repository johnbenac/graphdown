#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

const REPO_ROOT = path.resolve(__dirname, '..');
const SPEC_PATH = path.join(REPO_ROOT, 'SPEC.md');
const DATASET_ROOT = path.join(REPO_ROOT, 'spec-dataset');
const RECORDS_ROOT = path.join(DATASET_ROOT, 'records');

const REQ_LINE_REGEX =
  /(?:@--|<!--)\s*req:id=([A-Za-z0-9-]+)\s+title="([^"]+)"([^>-]*)(?:--|-->)/;
const REQ_ATTR_REGEX = /([a-zA-Z0-9_]+)=("([^"]*)"|([^\s"->]+))/g;

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function slugify(text) {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
  return slug || 'section';
}

function readSpec() {
  if (!fs.existsSync(SPEC_PATH)) {
    throw new Error(`SPEC.md not found at ${SPEC_PATH}`);
  }
  return fs.readFileSync(SPEC_PATH, 'utf8');
}

function parseHeader(lines) {
  let index = 0;
  while (index < lines.length && lines[index].trim() === '') index++;
  if (!lines[index] || !lines[index].startsWith('# ')) {
    throw new Error('SPEC.md missing top-level title heading');
  }
  const title = lines[index].slice(2).trim();
  index++;

  const meta = {};
  while (index < lines.length && lines[index].trim() === '') index++;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();
    if (trimmed === '') {
      index++;
      break;
    }
    const versionMatch = trimmed.match(/^\*\*Spec Version:\*\*\s*(.+)$/);
    const updatedMatch = trimmed.match(/^\*\*Last Updated:\*\*\s*(.+)$/);
    const statusMatch = trimmed.match(/^\*\*Status:\*\*\s*(.+)$/);
    if (versionMatch) meta.version = versionMatch[1].trim();
    if (updatedMatch) meta.lastUpdated = updatedMatch[1].trim();
    if (statusMatch) meta.status = statusMatch[1].trim();
    index++;
  }

  return { title, meta, index };
}

function parseSections(lines, startIndex, specRecordId) {
  const records = [];
  const orderCounters = new Map();
  const sectionStack = [];
  const usedSectionIds = new Map();

  let current = null;
  let bodyBuffer = [];
  let inCodeBlock = false;

  function nextOrder(parentKey) {
    const next = orderCounters.get(parentKey) ?? 0;
    orderCounters.set(parentKey, next + 1);
    return next;
  }

  function flushBody() {
    if (!current) return;
    current.body = bodyBuffer.join('\n');
    bodyBuffer = [];
  }

  function createSection({ title, level }) {
    const baseSlug = slugify(title);
    const seen = usedSectionIds.get(baseSlug) ?? 0;
    const recordId = seen === 0 ? baseSlug : `${baseSlug}-${seen + 1}`;
    usedSectionIds.set(baseSlug, seen + 1);

    while (sectionStack.length > 0 && sectionStack[sectionStack.length - 1].level >= level) {
      sectionStack.pop();
    }
    const parentIdentity =
      sectionStack.length > 0
        ? sectionStack[sectionStack.length - 1].identity
        : `spec:${specRecordId}`;
    const order = nextOrder(parentIdentity);

    const record = {
      typeId: 'section',
      recordId,
      parent: parentIdentity,
      fields: {
        title,
        order,
        level,
      },
      body: '',
    };
    records.push(record);
    sectionStack.push({ level, identity: `section:${recordId}` });
    current = record;
  }

  function createRequirement({ id, title, attrs, headingTitle, commentGap }) {
    const parentIdentity =
      sectionStack.length > 0
        ? sectionStack[sectionStack.length - 1].identity
        : `spec:${specRecordId}`;
    const order = nextOrder(parentIdentity);

    const fields = { title, order };
    if (headingTitle && headingTitle !== title) {
      fields.headingTitle = headingTitle;
    }
    if (commentGap && commentGap > 0) {
      fields.commentGap = commentGap;
    }
    if (attrs.testable !== undefined) {
      fields.testable = attrs.testable;
    }
    if (attrs.verify !== undefined) {
      fields.verify = attrs.verify;
    }

    const record = {
      typeId: 'req',
      recordId: id,
      parent: parentIdentity,
      fields,
      body: '',
    };
    records.push(record);
    current = record;
  }

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('```')) {
      bodyBuffer.push(line);
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (inCodeBlock) {
      bodyBuffer.push(line);
      continue;
    }

    const reqMatch = line.match(REQ_LINE_REGEX);
    if (reqMatch) {
      flushBody();
      const [, id, title, rawAttrs] = reqMatch;
      const attrs = {};
      if (rawAttrs && rawAttrs.trim().length > 0) {
        REQ_ATTR_REGEX.lastIndex = 0;
        let attrMatch;
        while ((attrMatch = REQ_ATTR_REGEX.exec(rawAttrs)) !== null) {
          const key = attrMatch[1];
          const value = attrMatch[3] ?? attrMatch[4] ?? '';
          if (key === 'testable') {
            attrs.testable = value.toLowerCase() === 'true';
          } else if (key === 'verify') {
            attrs.verify = value;
          }
        }
      }

      let headingIndex = i + 1;
      while (headingIndex < lines.length && lines[headingIndex].trim() === '') {
        headingIndex += 1;
      }
      const nextLine = lines[headingIndex];
      if (!nextLine || !nextLine.startsWith('### ')) {
        throw new Error(`Requirement ${id} is missing its heading line`);
      }
      const headingTitle = nextLine.includes('—')
        ? nextLine.split('—').slice(1).join('—').trim()
        : nextLine.replace(/^###\s+/, '').trim();
      const commentGap = Math.max(0, headingIndex - (i + 1));
      createRequirement({ id, title, attrs, headingTitle, commentGap });
      i = headingIndex;
      continue;
    }

    if (line.startsWith('#')) {
      const headingMatch = line.match(/^(#+)\s+(.*)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        if (level >= 2) {
          flushBody();
          createSection({ title: headingMatch[2].trim(), level });
          continue;
        }
      }
    }

    bodyBuffer.push(line);
  }

  flushBody();
  return records;
}

function writeRecord(record) {
  const dir = path.join(RECORDS_ROOT, record.typeId);
  ensureDir(dir);
  const filePath = path.join(dir, `${record.recordId}.md`);
  const frontMatter = {
    typeId: record.typeId,
    recordId: record.recordId,
    fields: record.fields,
  };
  if (record.parent !== undefined) {
    frontMatter.parent = record.parent;
  }

  const yaml = YAML.stringify(frontMatter).trimEnd();
  let body = record.body ?? '';
  if (body !== '' && !body.startsWith('\n')) {
    body = `\n${body}`;
  }
  if (body !== '' && !body.endsWith('\n')) {
    body += '\n';
  }
  const output = `---\n${yaml}\n---${body || '\n'}`;
  fs.writeFileSync(filePath, output);
}

function main() {
  const specText = readSpec();
  const lines = specText.split(/\r?\n/);

  const { title, meta, index } = parseHeader(lines);

  const specRecordId = 'graphmd-standard-v0-5';
  const specBodyLines = [];
  for (let i = index; i < lines.length; i++) {
    if (lines[i].startsWith('## ')) {
      break;
    }
    specBodyLines.push(lines[i]);
  }
  const firstSectionIndex = index + specBodyLines.length;
  const specBody = specBodyLines.join('\n');

  const specRecord = {
    typeId: 'spec',
    recordId: specRecordId,
    parent: undefined,
    fields: {
      title,
      version: meta.version,
      lastUpdated: meta.lastUpdated,
      status: meta.status,
    },
    body: specBody,
  };

  const sectionRecords = parseSections(lines, firstSectionIndex, specRecordId);

  ensureDir(RECORDS_ROOT);
  writeRecord(specRecord);
  sectionRecords.forEach(writeRecord);

  console.log(
    `Imported SPEC.md into ${sectionRecords.length + 1} records under spec-dataset/records.`,
  );
}

if (require.main === module) {
  main();
}
