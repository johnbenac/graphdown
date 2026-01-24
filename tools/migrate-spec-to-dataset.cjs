#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const SPEC_PATH = path.join(REPO_ROOT, 'SPEC.md');
const DATASET_ROOT = path.join(REPO_ROOT, 'spec-dataset');

const SECTION_HEADING_REGEX = /^(#{2,6})\s+(.*)$/;
const SPEC_TITLE_REGEX = /^#\s+(.*)$/;
const REQ_LINE_REGEX =
  /(?:@--|<!--)\s*req:id=([A-Za-z0-9-]+)\s+title="([^"]+)"([^>-]*)(?:--|-->)/;
const REQ_ATTR_REGEX = /([a-zA-Z0-9_]+)=(["']([^"']*)["']|([^\s"->]+))/g;

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/--+/g, '-');
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeRecord({ typeId, recordId, parent, fields, body }) {
  const safeType = typeId;
  const dir = path.join(DATASET_ROOT, 'records', safeType);
  ensureDir(dir);
  const filePath = path.join(dir, `${recordId}.md`);
  const frontMatter = [
    '---',
    `typeId: ${JSON.stringify(typeId)}`,
    `recordId: ${JSON.stringify(recordId)}`,
  ];
  if (parent !== undefined) {
    frontMatter.push(`parent: ${parent === null ? 'null' : JSON.stringify(parent)}`);
  }
  frontMatter.push('fields:');
  const fieldEntries = Object.entries(fields || {});
  if (fieldEntries.length === 0) {
    frontMatter.push('  {}');
  } else {
    for (const [key, value] of fieldEntries) {
      if (typeof value === 'string') {
        frontMatter.push(`  ${key}: ${JSON.stringify(value)}`);
      } else if (typeof value === 'boolean' || typeof value === 'number') {
        frontMatter.push(`  ${key}: ${value}`);
      } else {
        frontMatter.push(`  ${key}: ${JSON.stringify(value)}`);
      }
    }
  }
  frontMatter.push('---');

  const trimmedBody = String(body ?? '').replace(/^\n+/, '').trimEnd();
  const content = trimmedBody
    ? `${frontMatter.join('\n')}\n\n${trimmedBody}\n`
    : `${frontMatter.join('\n')}\n`;
  fs.writeFileSync(filePath, content);
}

function writeTypes() {
  ensureDir(path.join(DATASET_ROOT, 'types'));
  const types = {
    spec: `---\ntypeId: spec\nfields:\n  fieldDefs:\n    title: { required: true }\n    version: { required: false }\n    lastUpdated: { required: false }\n    status: { required: false }\n---\n`,
    section: `---\ntypeId: section\nfields:\n  fieldDefs:\n    title: { required: true }\n    order: { required: false }\n    level: { required: false }\n---\n`,
    req: `---\ntypeId: req\nfields:\n  fieldDefs:\n    title: { required: true }\n    testable: { required: false }\n    verify: { required: false }\n    level: { required: false }\n    status: { required: false }\n    rationale: { required: false }\n    notes: { required: false }\n---\n`,
    test: `---\ntypeId: test\nfields:\n  fieldDefs:\n    title: { required: true }\n    file: { required: false }\n    kind: { required: false }\n    status: { required: false }\n  composition:\n    verifies:\n      typeId: req\n      required: true\n---\n`,
  };

  for (const [name, content] of Object.entries(types)) {
    fs.writeFileSync(path.join(DATASET_ROOT, 'types', `${name}.md`), content);
  }
}

function parseSpec() {
  const text = fs.readFileSync(SPEC_PATH, 'utf8');
  const lines = text.split(/\r?\n/);
  const inCodeBlock = [];
  let inFence = false;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim().startsWith('```')) {
      inFence = !inFence;
    }
    inCodeBlock[i] = inFence;
  }

  let specTitle = null;
  let specLineIndex = -1;

  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(SPEC_TITLE_REGEX);
    if (match) {
      specTitle = match[1].trim();
      specLineIndex = i;
      break;
    }
  }

  if (!specTitle) {
    throw new Error('SPEC.md missing top-level title');
  }

  let version;
  let lastUpdated;
  let status;
  const bodyLines = [];

  let i = specLineIndex + 1;
  while (i < lines.length && !SECTION_HEADING_REGEX.test(lines[i])) {
    const line = lines[i];
    const versionMatch = line.match(/^\*\*Spec Version:\*\*\s*(.*)$/);
    const lastUpdatedMatch = line.match(/^\*\*Last Updated:\*\*\s*(.*)$/);
    const statusMatch = line.match(/^\*\*Status:\*\*\s*(.*)$/);
    if (versionMatch) {
      version = versionMatch[1].trim();
    } else if (lastUpdatedMatch) {
      lastUpdated = lastUpdatedMatch[1].trim();
    } else if (statusMatch) {
      status = statusMatch[1].trim();
    } else {
      bodyLines.push(line);
    }
    i += 1;
  }

  return {
    specTitle,
    version,
    lastUpdated,
    status,
    body: bodyLines.join('\n').trimEnd(),
    startIndex: i,
    lines,
    inCodeBlock,
  };
}

function migrate() {
  if (!fs.existsSync(SPEC_PATH)) {
    throw new Error('SPEC.md not found');
  }

  ensureDir(DATASET_ROOT);
  ensureDir(path.join(DATASET_ROOT, 'records'));
  ensureDir(path.join(DATASET_ROOT, 'blocks'));
  ensureDir(path.join(DATASET_ROOT, 'plugins'));

  writeTypes();

  const {
    specTitle,
    version,
    lastUpdated,
    status,
    body,
    startIndex,
    lines,
    inCodeBlock,
  } = parseSpec();

  const specRecordId = 'graphmd-standard-v0-5';
  const specIdentity = `spec:${specRecordId}`;

  writeRecord({
    typeId: 'spec',
    recordId: specRecordId,
    parent: undefined,
    fields: {
      title: specTitle,
      version,
      lastUpdated,
      status,
    },
    body: body || '',
  });

  const slugCounts = new Map();
  const sectionStack = [{ level: 1, identity: specIdentity }];
  const orderCounters = new Map();

  const nextOrder = (parentId) => {
    const current = orderCounters.get(parentId) ?? 0;
    orderCounters.set(parentId, current + 1);
    return current;
  };

  const findNextNodeIndex = (start) => {
    for (let idx = start; idx < lines.length; idx += 1) {
      if (inCodeBlock[idx]) continue;
      if (lines[idx].match(REQ_LINE_REGEX)) return idx;
      if (SECTION_HEADING_REGEX.test(lines[idx])) return idx;
    }
    return lines.length;
  };

  let i = startIndex;
  while (i < lines.length) {
    const line = lines[i];

    const reqMatch = !inCodeBlock[i] ? line.match(REQ_LINE_REGEX) : null;
    if (reqMatch) {
      const [, reqId, reqTitle, rawAttrs] = reqMatch;
      const attrs = {};
      if (rawAttrs && rawAttrs.trim().length > 0) {
        REQ_ATTR_REGEX.lastIndex = 0;
        let attrMatch;
        while ((attrMatch = REQ_ATTR_REGEX.exec(rawAttrs)) !== null) {
          const key = attrMatch[1];
          const value = attrMatch[3] ?? attrMatch[4] ?? '';
          attrs[key] = value;
        }
      }

      let headingIndex = i + 1;
      while (headingIndex < lines.length && !lines[headingIndex].startsWith('### ')) {
        headingIndex += 1;
      }
      if (headingIndex >= lines.length) {
        throw new Error(`Missing requirement heading for ${reqId}`);
      }
      const headingLine = lines[headingIndex];
      const headingMatch = headingLine.match(new RegExp(`^###\\s+${reqId}\\s+—\\s+(.*)$`));
      const headingTitle = headingMatch ? headingMatch[1].trim() : reqTitle;

      const nextNode = findNextNodeIndex(headingIndex + 1);
      const bodyLines = lines.slice(headingIndex + 1, nextNode);
      const parentIdentity = sectionStack[sectionStack.length - 1]?.identity ?? specIdentity;
      const order = nextOrder(parentIdentity);

      writeRecord({
        typeId: 'req',
        recordId: reqId,
        parent: parentIdentity,
        fields: {
          title: reqTitle,
          ...(headingTitle !== reqTitle ? { heading: headingTitle } : {}),
          ...(attrs.testable !== undefined ? { testable: attrs.testable === 'true' } : {}),
          ...(attrs.verify ? { verify: attrs.verify } : {}),
          order,
        },
        body: bodyLines.join('\n').trimEnd(),
      });

      i = nextNode;
      continue;
    }

    const sectionMatch = !inCodeBlock[i] ? line.match(SECTION_HEADING_REGEX) : null;
    if (sectionMatch) {
      const level = sectionMatch[1].length;
      const title = sectionMatch[2].trim();
      const baseSlug = slugify(title) || `section-${level}`;
      const count = slugCounts.get(baseSlug) ?? 0;
      slugCounts.set(baseSlug, count + 1);
      const recordId = count === 0 ? baseSlug : `${baseSlug}-${count + 1}`;

      while (sectionStack.length > 0 && sectionStack[sectionStack.length - 1].level >= level) {
        sectionStack.pop();
      }
      const parentIdentity = sectionStack[sectionStack.length - 1]?.identity ?? specIdentity;
      const order = nextOrder(parentIdentity);

      const nextNode = findNextNodeIndex(i + 1);
      const bodyLines = lines.slice(i + 1, nextNode);

      writeRecord({
        typeId: 'section',
        recordId,
        parent: parentIdentity,
        fields: {
          title,
          level,
          order,
        },
        body: bodyLines.join('\n').trimEnd(),
      });

      const identity = `section:${recordId}`;
      sectionStack.push({ level, identity });

      i = nextNode;
      continue;
    }

    i += 1;
  }

  console.log('Spec dataset generated in spec-dataset/.');
}

if (require.main === module) {
  migrate();
}

module.exports = { migrate };
