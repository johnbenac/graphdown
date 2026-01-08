#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "apps", "web", "src");
const violations = [];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    const relativePath = path.relative(root, fullPath).split(path.sep).join("/");
    const isTestFile = /\.test\.[^.]+$/.test(entry.name);
    const isSpecJsFile = /\.spec\.js$/.test(entry.name);

    const isInTestsDir = relativePath.split("/").includes("__tests__");

    if (isTestFile && !isInTestsDir) {
      violations.push(`Vitest test must live in __tests__: ${relativePath}`);
    }

    if (isSpecJsFile) {
      violations.push(`Playwright-style spec found in src: ${relativePath}`);
    }
  }
}

if (!fs.existsSync(root)) {
  console.error(`Expected src directory at ${root}`);
  process.exit(1);
}

walk(root);

if (violations.length > 0) {
  console.error("Test layout violations detected:");
  for (const message of violations) {
    console.error(`- ${message}`);
  }
  process.exit(1);
}

console.log("Test layout check passed.");
