#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");

const violations = [];

function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

function walk(dir, onFile) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const skip = onFile(fullPath, entry, true);
      if (!skip) {
        walk(fullPath, onFile);
      }
      continue;
    }
    if (entry.isFile()) {
      onFile(fullPath, entry, false);
    }
  }
}

function addViolation(filePath, reason) {
  violations.push({ path: toPosix(path.relative(repoRoot, filePath)), reason });
}

function checkWebSrc() {
  const srcRoot = path.join(repoRoot, "apps", "web", "src");
  if (!fs.existsSync(srcRoot)) {
    addViolation(srcRoot, "Expected apps/web/src directory not found");
    return;
  }

  walk(srcRoot, (fullPath, entry) => {
    if (entry.isDirectory()) return;

    if (entry.name.includes(".spec.")) {
      addViolation(fullPath, "Playwright specs are not allowed under apps/web/src");
      return;
    }

    if (entry.name.match(/\.test\.(ts|tsx)$/)) {
      const relPath = path.relative(repoRoot, fullPath);
      const hasTestsDir = relPath.split(path.sep).includes("__tests__");
      if (!hasTestsDir) {
        addViolation(fullPath, "Vitest tests must live under a __tests__ directory");
      }

      const isNamedCorrectly = entry.name.match(/(?:\.nfr)?\.(unit|integration)\.test\.(ts|tsx)$/);
      if (!isNamedCorrectly) {
        addViolation(
          fullPath,
          "Web tests must include .unit. or .integration. in the filename (optionally .nfr.)"
        );
      }
    }
  });
}

function checkWebE2E() {
  const e2eRoot = path.join(repoRoot, "apps", "web", "e2e");
  if (!fs.existsSync(e2eRoot)) {
    addViolation(e2eRoot, "Expected apps/web/e2e directory not found");
    return;
  }

  walk(e2eRoot, (fullPath, entry, isDir) => {
    if (isDir && entry.name.endsWith("-snapshots")) {
      return true;
    }

    if (entry.isDirectory()) return;

    if (entry.name.match(/\.(js|ts)$/)) {
      if (!entry.name.match(/\.e2e\.spec\.(js|ts)$/)) {
        addViolation(fullPath, "E2E specs must be named *.e2e.spec.(js|ts)");
      }
    }
  });
}

function checkCoreTests() {
  const coreRoot = path.join(repoRoot, "packages", "core", "src");
  if (!fs.existsSync(coreRoot)) {
    addViolation(coreRoot, "Expected packages/core/src directory not found");
    return;
  }

  walk(coreRoot, (fullPath, entry) => {
    if (entry.isDirectory()) return;

    if (!entry.name.match(/\.test\.ts$/)) return;

    const relPath = toPosix(path.relative(repoRoot, fullPath));
    const hasTestsDir = relPath.split("/").includes("__tests__");

    if (!hasTestsDir) {
      addViolation(fullPath, "Core tests must live under a __tests__ directory");
      return;
    }

    if (relPath.includes("/__tests__/spec/")) {
      if (!entry.name.endsWith(".integration.test.ts")) {
        addViolation(fullPath, "Core spec tests must be named *.integration.test.ts");
      }
      return;
    }

    if (relPath.includes("/__tests__/governance/")) {
      if (!entry.name.endsWith(".governance.integration.test.ts")) {
        addViolation(
          fullPath,
          "Core governance tests must be named *.governance.integration.test.ts"
        );
      }
      return;
    }

    if (!entry.name.endsWith(".unit.test.ts")) {
      addViolation(fullPath, "Core unit tests must be named *.unit.test.ts");
    }
  });
}

checkWebSrc();
checkWebE2E();
checkCoreTests();

if (violations.length > 0) {
  console.error("Test convention violations found:\n");
  for (const violation of violations) {
    console.error(`- ${violation.path}: ${violation.reason}`);
  }
  process.exit(1);
}

console.log("Test convention check passed.");
