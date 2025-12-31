const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const SPEC_PATH = path.join(ROOT_DIR, 'SPEC.md');
const TESTS_DIR = path.join(ROOT_DIR, 'tests');
const OUTPUT_DIR = path.join(ROOT_DIR, 'artifacts', 'spec-trace');

const REQUIREMENT_REGEX = /<!--\s*req:id=([A-Z0-9-]+)\s+title="([^"]+)"\s*-->/g;
const TEST_TITLE_REGEX = /\b(?:it|test)\s*\(\s*(['"])(.*?)\1/g;
const REQUIREMENT_ID_REGEX = /^([A-Z][A-Z0-9-]*)\b/;

function listTestFiles(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      return listTestFiles(entryPath);
    }
    if (entry.isFile() && entry.name.endsWith('.test.js')) {
      return [entryPath];
    }
    return [];
  });
}

function extractRequirements(specContent) {
  const requirements = [];
  let match;
  while ((match = REQUIREMENT_REGEX.exec(specContent)) !== null) {
    requirements.push({ id: match[1], title: match[2] });
  }
  return requirements;
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
      const idMatch = REQUIREMENT_ID_REGEX.exec(title.trim());
      if (!idMatch) {
        continue;
      }

      const requirementId = idMatch[1];
      const list = references.get(requirementId) ?? [];
      list.push({
        title,
        file: path.relative(ROOT_DIR, filePath),
      });
      references.set(requirementId, list);
    }
  });

  return references;
}

function ensureOutputDir() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function writeMatrixFiles(matrix) {
  ensureOutputDir();

  const jsonPath = path.join(OUTPUT_DIR, 'matrix.json');
  fs.writeFileSync(jsonPath, JSON.stringify(matrix, null, 2));

  const markdownLines = ['# Spec Verification Matrix', ''];
  matrix.requirements.forEach((req) => {
    markdownLines.push(`## ${req.id} — ${req.title}`);
    if (req.tests.length === 0) {
      markdownLines.push('', '_No tests found._', '');
      return;
    }
    markdownLines.push('');
    req.tests.forEach((test) => {
      markdownLines.push(`- ${test.title} (${test.file})`);
    });
    markdownLines.push('');
  });

  if (matrix.unknownTestIds.length > 0) {
    markdownLines.push('## Unknown requirement IDs', '');
    matrix.unknownTestIds.forEach((id) => {
      markdownLines.push(`- ${id}`);
    });
    markdownLines.push('');
  }

  if (matrix.missingTests.length > 0) {
    markdownLines.push('## Requirements without tests', '');
    matrix.missingTests.forEach((id) => {
      markdownLines.push(`- ${id}`);
    });
    markdownLines.push('');
  }

  const markdownPath = path.join(OUTPUT_DIR, 'matrix.md');
  fs.writeFileSync(markdownPath, markdownLines.join('\n'));
}

function main() {
  const specContent = fs.readFileSync(SPEC_PATH, 'utf8');
  const requirements = extractRequirements(specContent);
  const requirementMap = new Map(requirements.map((req) => [req.id, req]));

  const testFiles = listTestFiles(TESTS_DIR);
  const references = extractReferencedRequirements(testFiles);

  const unknownTestIds = Array.from(references.keys()).filter(
    (id) => !requirementMap.has(id),
  );

  const requirementsWithTests = requirements.map((req) => ({
    ...req,
    tests: references.get(req.id) ?? [],
  }));

  const missingTests = requirementsWithTests
    .filter((req) => req.tests.length === 0)
    .map((req) => req.id);

  const matrix = {
    generatedAt: new Date().toISOString(),
    requirements: requirementsWithTests,
    unknownTestIds,
    missingTests,
  };

  writeMatrixFiles(matrix);

  if (unknownTestIds.length > 0) {
    console.error(
      `Unknown requirement IDs referenced by tests: ${unknownTestIds.join(', ')}`,
    );
    process.exitCode = 1;
  }
}

main();
