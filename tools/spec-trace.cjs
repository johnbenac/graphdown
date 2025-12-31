#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const SPEC_PATH = path.join(REPO_ROOT, 'SPEC.md');
const ARTIFACTS_DIR = path.join(REPO_ROOT, 'artifacts', 'spec-trace');
const TEST_TITLE_REGEX = /\b(?:it|test)\s*\(\s*(['"])(.*?)\1/g;
const TEST_FILE_REGEX = /\.(test|spec)\.[jt]sx?$/;
const SKIP_DIRS = new Set([
  '.git',
  'artifacts',
  'dist',
  'node_modules',
  'playwright-report',
  'test-results',
]);

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readSpecRequirements() {
  const specContent = fs.readFileSync(SPEC_PATH, 'utf8');
  const requirements = new Map();
  const specRegex = /<!--\s*req:id=([A-Z0-9-]+)\s+title="([^"]+)"\s*-->/g;
  let match;

  while ((match = specRegex.exec(specContent)) !== null) {
    const id = match[1];
    const title = match[2];
    if (!requirements.has(id)) {
      requirements.set(id, { id, title });
    }
  }

  return requirements;
}

function collectTestFiles(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) {
        continue;
      }
      files.push(...collectTestFiles(entryPath));
      continue;
    }

    if (entry.isFile() && TEST_FILE_REGEX.test(entry.name)) {
      files.push(entryPath);
    }
  }

  return files;
}

function extractReferencedRequirements(testFiles) {
  const references = new Map();

  testFiles.forEach((filePath) => {
    const content = fs.readFileSync(filePath, 'utf8');

    // Reset because TEST_TITLE_REGEX is global (/g) and carries lastIndex state.
    TEST_TITLE_REGEX.lastIndex = 0;

    let match;
    while ((match = TEST_TITLE_REGEX.exec(content)) !== null) {
      const title = match[2];
      const idMatch = title.match(/^([A-Z][A-Z0-9-]+):/);
      if (!idMatch) {
        continue;
      }

      const requirementId = idMatch[1];
      if (!references.has(requirementId)) {
        references.set(requirementId, []);
      }

      references.get(requirementId).push({
        title,
        file: path.relative(REPO_ROOT, filePath),
      });
    }
  });

  return references;
}

function buildMatrix(requirements, references) {
  const sortedRequirements = Array.from(requirements.values()).sort((a, b) =>
    a.id.localeCompare(b.id),
  );

  return sortedRequirements.map((requirement) => ({
    ...requirement,
    tests: references.get(requirement.id) ?? [],
  }));
}

function buildUnknownReferences(requirements, references) {
  const unknownIds = [];
  for (const id of references.keys()) {
    if (!requirements.has(id)) {
      unknownIds.push(id);
    }
  }
  return unknownIds.sort();
}

function writeArtifacts(matrix, unknownIds) {
  ensureDir(ARTIFACTS_DIR);
  const jsonPath = path.join(ARTIFACTS_DIR, 'matrix.json');
  const mdPath = path.join(ARTIFACTS_DIR, 'matrix.md');

  const payload = {
    generatedAt: new Date().toISOString(),
    requirements: matrix,
    unknownReferences: unknownIds,
  };

  fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2));

  const mdLines = ['# Spec verification matrix', ''];
  if (unknownIds.length > 0) {
    mdLines.push('## Unknown requirement references');
    mdLines.push('');
    unknownIds.forEach((id) => {
      mdLines.push(`- ${id}`);
    });
    mdLines.push('');
  }

  mdLines.push('| Requirement | Title | Tests |');
  mdLines.push('| --- | --- | --- |');
  matrix.forEach((requirement) => {
    const tests = requirement.tests.length
      ? requirement.tests
          .map((test) => `\`${test.file}\` — ${test.title}`)
          .join('<br />')
      : '—';
    mdLines.push(`| ${requirement.id} | ${requirement.title} | ${tests} |`);
  });

  fs.writeFileSync(mdPath, `${mdLines.join('\n')}\n`);
}

function main() {
  if (!fs.existsSync(SPEC_PATH)) {
    console.error(`Spec file not found: ${SPEC_PATH}`);
    process.exit(1);
  }

  const requirements = readSpecRequirements();
  const testFiles = collectTestFiles(REPO_ROOT);
  const references = extractReferencedRequirements(testFiles);
  const matrix = buildMatrix(requirements, references);
  const unknownIds = buildUnknownReferences(requirements, references);

  writeArtifacts(matrix, unknownIds);

  if (unknownIds.length > 0) {
    console.error(
      `Unknown requirement IDs referenced in tests: ${unknownIds.join(', ')}`,
    );
    process.exit(1);
  }
}

main();
