#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(process.cwd());
const webSrcRoot = path.join(repoRoot, "apps", "web", "src");

const violations = [];

const isTestFile = (fileName) => /\.test\.[^.]+$/.test(fileName);
const isSpecJsFile = (fileName) => fileName.endsWith(".spec.js");

const walk = (dir) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const relPath = path.relative(webSrcRoot, fullPath).split(path.sep).join("/");
    if (isTestFile(entry.name) && !relPath.includes("/__tests__/")) {
      violations.push(`Test file must live in __tests__: ${relPath}`);
    }
    if (isSpecJsFile(entry.name)) {
      violations.push(`Spec files are not allowed in src: ${relPath}`);
    }
  }
};

if (!fs.existsSync(webSrcRoot)) {
  console.error(`Expected src root not found: ${webSrcRoot}`);
  process.exit(1);
}

walk(webSrcRoot);

if (violations.length > 0) {
  console.error("Invalid test layout detected:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log("Web test layout check passed.");
