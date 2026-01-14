const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");

const violations = [];

const IGNORE_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  ".ci",
  "artifacts",
  "test-results",
  "playwright-report"
]);

function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

function isTestFile(fileName) {
  return /\.test\.[^.]+$/.test(fileName);
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) {
        continue;
      }
      walk(fullPath);
      continue;
    }

    if (entry.isFile()) {
      checkFile(fullPath);
    }
  }
}

function checkFile(fullPath) {
  const relPath = toPosix(path.relative(repoRoot, fullPath));
  const fileName = path.basename(fullPath);

  const underWebSrc = relPath.startsWith("apps/web/src/");
  const underWebE2E = relPath.startsWith("apps/web/e2e/");
  const underCoreSrc = relPath.startsWith("packages/core/src/");

  if (underWebSrc && /\.spec\.[^.]+$/.test(fileName)) {
    violations.push({
      path: relPath,
      reason: "Playwright specs are not allowed under apps/web/src"
    });
  }

  if (underWebSrc && isTestFile(fileName)) {
    if (!relPath.includes("/__tests__/")) {
      violations.push({
        path: relPath,
        reason: "Web tests must live under a __tests__ directory"
      });
    } else if (!/\.(unit|integration)\.test\.(ts|tsx)$/.test(relPath)) {
      violations.push({
        path: relPath,
        reason: "Web tests must be named *.unit.test.ts(x) or *.integration.test.ts(x)"
      });
    }
  }

  if (underWebE2E && /\.spec\.(js|ts)$/.test(fileName)) {
    if (!/\.e2e\.spec\.(js|ts)$/.test(fileName)) {
      violations.push({
        path: relPath,
        reason: "E2E tests must be named *.e2e.spec.(js|ts)"
      });
    }
  }

  if (underCoreSrc && isTestFile(fileName)) {
    if (relPath.includes("/__tests__/spec/")) {
      if (!/\.integration\.test\.ts$/.test(relPath)) {
        violations.push({
          path: relPath,
          reason: "Core integration tests must be named *.integration.test.ts under src/__tests__/spec"
        });
      }
    } else if (relPath.includes("/__tests__/governance/")) {
      if (!/\.(governance\.)?integration\.test\.ts$/.test(relPath)) {
        violations.push({
          path: relPath,
          reason:
            "Core governance tests must be named *.governance.integration.test.ts (or *.integration.test.ts) under src/__tests__/governance"
        });
      }
    } else if (relPath.includes("/__tests__/")) {
      if (!/\.unit\.test\.ts$/.test(relPath)) {
        violations.push({
          path: relPath,
          reason: "Core unit tests must be named *.unit.test.ts under src/**/__tests__"
        });
      }
    } else {
      violations.push({
        path: relPath,
        reason: "Core tests must live under a __tests__ directory"
      });
    }
  }

  if (isTestFile(fileName) && !/\.(unit|integration)\.test\.[^.]+$/.test(fileName)) {
    violations.push({
      path: relPath,
      reason: "All test files must include .unit. or .integration. in the filename"
    });
  }
}

walk(repoRoot);

if (violations.length > 0) {
  console.error("Test convention violations found:\n");
  for (const violation of violations) {
    console.error(`- ${violation.path}: ${violation.reason}`);
  }
  process.exit(1);
}

console.log("Test conventions check passed.");
