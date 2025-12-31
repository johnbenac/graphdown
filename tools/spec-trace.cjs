#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT_DIR = process.cwd();
const SPEC_PATH = path.join(ROOT_DIR, 'SPEC.md');
const OUTPUT_DIR = path.join(ROOT_DIR, 'artifacts', 'spec-trace');
const TEST_TITLE_REGEX = /\b(?:it|test)\s*\(\s*(['"])(.*?)\1/g;
const REQUIREMENT_ID_REGEX = /([A-Z][A-Z0-9]+-\d+)/;

function readSpecRequirements() {
  if (!fs.existsSync(SPEC_PATH)) {
    throw new Error(`SPEC.md not found at ${SPEC_PATH}`);
  }

  const contents = fs.readFileSync(SPEC_PATH, 'utf8');
  const requirements = new Map();
  const regex = /<!--\s*req:id=([A-Za-z0-9-]+)\s+title="([^"]+)"\s*-->/g;
  let match;
  while ((match = regex.exec(contents)) !== null) {
    const id = match[1];
    const title = match[2];
    requirements.set(id, title);
  }

  return requirements;
}

function collectTestFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTestFiles(fullPath));
      continue;
    }

    if (/\.(test|spec)\.(js|ts|tsx|cjs|mjs)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function extractReferencedRequirements(testFiles) {
  const references = new Map();
  const unknown = [];

  testFiles.forEach((filePath) => {
    const content = fs.readFileSync(filePath, 'utf8');

    // Reset because TEST_TITLE_REGEX is global (/g) and carries lastIndex state.
    TEST_TITLE_REGEX.lastIndex = 0;

    let match;
    while ((match = TEST_TITLE_REGEX.exec(content)) !== null) {
      const title = match[2];
      const idMatch = title.match(REQUIREMENT_ID_REGEX);
      if (!idMatch) {
        continue;
      }

      const id = idMatch[1];
      if (!references.has(id)) {
        references.set(id, []);
      }
      references.get(id).push({
        filePath: path.relative(ROOT_DIR, filePath),
        title,
      });
    }
  });

  return { references, unknown };
}

function buildMatrix(requirements, references) {
  const matrix = [];
  for (const [id, title] of requirements.entries()) {
    matrix.push({
      id,
      title,
      tests: references.get(id) ?? [],
    });
  }

  return matrix;
}

function writeOutputs(matrix, unknownIds) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const jsonPath = path.join(OUTPUT_DIR, 'matrix.json');
  const mdPath = path.join(OUTPUT_DIR, 'matrix.md');

  const jsonPayload = {
    generatedAt: new Date().toISOString(),
    requirements: matrix,
    unknownIds,
  };

  fs.writeFileSync(jsonPath, `${JSON.stringify(jsonPayload, null, 2)}\n`, 'utf8');

  const lines = [
    '# Spec Trace Matrix',
    '',
    '| Requirement | Title | Tests |',
    '| --- | --- | --- |',
  ];

  matrix.forEach((entry) => {
    const testDescriptions = entry.tests
      .map((test) => `\`${test.title}\` (${test.filePath})`)
      .join('<br />');
    lines.push(`| ${entry.id} | ${entry.title} | ${testDescriptions || '—'} |`);
  });

  if (unknownIds.length > 0) {
    lines.push('', '## Unknown requirement IDs', '');
    unknownIds.forEach((unknown) => {
      lines.push(`- ${unknown.id}: ${unknown.title} (${unknown.filePath})`);
    });
  }

  fs.writeFileSync(mdPath, `${lines.join('\n')}\n`, 'utf8');
}

function main() {
  const requirements = readSpecRequirements();
  const testFiles = collectTestFiles(ROOT_DIR);
  const { references } = extractReferencedRequirements(testFiles);

  const unknownIds = [];
  for (const [id, tests] of references.entries()) {
    if (!requirements.has(id)) {
      tests.forEach((test) => {
        unknownIds.push({
          id,
          title: test.title,
          filePath: test.filePath,
        });
      });
    }
  }

  const matrix = buildMatrix(requirements, references);
  writeOutputs(matrix, unknownIds);

  if (unknownIds.length > 0) {
    const ids = Array.from(new Set(unknownIds.map((entry) => entry.id))).join(', ');
    console.error(`Unknown requirement IDs found in tests: ${ids}`);
    process.exit(1);
  }

  console.log(`Spec trace matrix written to ${OUTPUT_DIR}`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
