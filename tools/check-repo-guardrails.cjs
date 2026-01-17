const fs = require('node:fs');
const path = require('node:path');

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function dirHasFiles(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return false;
  }
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isFile()) {
      return true;
    }
    if (entry.isDirectory() && dirHasFiles(fullPath)) {
      return true;
    }
  }
  return false;
}

const forbiddenFiles = ['docs/spec/dataset-validity.md'];
for (const filePath of forbiddenFiles) {
  if (fs.existsSync(filePath)) {
    fail(`Forbidden file detected: ${filePath}`);
  }
}

const forbiddenDirs = ['docs/debt', 'docs/memos'];
for (const dirPath of forbiddenDirs) {
  if (dirHasFiles(dirPath)) {
    fail(`Forbidden docs directory contains files: ${dirPath}`);
  }
}

if (fs.existsSync('docs')) {
  const entries = fs.readdirSync('docs', { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile() && entry.name.startsWith('oom-')) {
      fail(`Forbidden OOM doc detected: docs/${entry.name}`);
    }
  }
}

const pagesWorkflowPath = path.join('.github', 'workflows', 'pages.yml');
if (fs.existsSync(pagesWorkflowPath)) {
  const contents = fs.readFileSync(pagesWorkflowPath, 'utf8');
  const requiredPaths = ['packages/runtime/src/**', 'packages/runtime/package.json'];
  for (const required of requiredPaths) {
    if (!contents.includes(required)) {
      fail(`pages.yml is missing required deploy path: ${required}`);
    }
  }
}

if (process.exitCode === 1) {
  console.error('Repo guardrails failed.');
  process.exit(1);
}
