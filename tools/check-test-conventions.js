const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");

const SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "artifacts",
  "test-results",
  "playwright-report",
  ".ci"
]);

const violations = [];

function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

function shouldSkipDir(name) {
  return SKIP_DIRS.has(name);
}

function walk(dir, onFile) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (shouldSkipDir(entry.name)) {
        continue;
      }
      walk(fullPath, onFile);
      continue;
    }

    if (entry.isFile()) {
      onFile(fullPath);
    }
  }
}

function isAllowedTestName(fileName) {
  return (
    /\.nfr\.(unit|integration)\.test\.(ts|tsx|js|jsx)$/.test(fileName) ||
    /\.governance\.integration\.test\.(ts|tsx|js|jsx)$/.test(fileName) ||
    /\.(unit|integration)\.test\.(ts|tsx|js|jsx)$/.test(fileName)
  );
}

function checkGeneralTestNaming() {
  walk(repoRoot, (fullPath) => {
    const fileName = path.basename(fullPath);
    if (!/\.test\./.test(fileName)) {
      return;
    }
    if (!isAllowedTestName(fileName)) {
      violations.push({
        path: toPosix(path.relative(repoRoot, fullPath)),
        reason: "Test files must include .unit. or .integration. in the filename"
      });
    }
  });
}

function checkWebTests() {
  const webSrcRoot = path.join(repoRoot, "apps", "web", "src");
  if (!fs.existsSync(webSrcRoot)) {
    return;
  }

  walk(webSrcRoot, (fullPath) => {
    const relPath = toPosix(path.relative(repoRoot, fullPath));
    const fileName = path.basename(fullPath);

    if (/\.spec\.(js|ts|jsx|tsx)$/.test(fileName)) {
      violations.push({
        path: relPath,
        reason: "Playwright specs are not allowed under apps/web/src"
      });
    }

    if (/\.test\.(ts|tsx)$/.test(fileName)) {
      const hasTestsDir = relPath.split("/").includes("__tests__");
      if (!hasTestsDir) {
        violations.push({
          path: relPath,
          reason: "Web Vitest tests must live under a __tests__ directory"
        });
      }

      if (!/\.nfr\.(unit|integration)\.test\.(ts|tsx)$/.test(fileName) &&
          !/\.(unit|integration)\.test\.(ts|tsx)$/.test(fileName)) {
        violations.push({
          path: relPath,
          reason: "Web tests must be named *.unit.test.* or *.integration.test.*"
        });
      }
    }
  });
}

function checkWebE2E() {
  const e2eRoot = path.join(repoRoot, "apps", "web", "e2e");
  if (!fs.existsSync(e2eRoot)) {
    return;
  }

  walk(e2eRoot, (fullPath) => {
    const relPath = toPosix(path.relative(repoRoot, fullPath));
    if (!/\.(js|ts)$/.test(fullPath)) {
      return;
    }
    if (!/\.e2e\.spec\.(js|ts)$/.test(fullPath)) {
      violations.push({
        path: relPath,
        reason: "E2E tests must be named *.e2e.spec.(js|ts)"
      });
    }
  });
}

function checkCoreTests() {
  const coreRoot = path.join(repoRoot, "packages", "core", "src");
  if (!fs.existsSync(coreRoot)) {
    return;
  }

  walk(coreRoot, (fullPath) => {
    const relPath = toPosix(path.relative(repoRoot, fullPath));
    const fileName = path.basename(fullPath);
    if (!/\.test\.ts$/.test(fileName)) {
      return;
    }

    const isInTestsDir = relPath.split("/").includes("__tests__");
    if (!isInTestsDir) {
      violations.push({
        path: relPath,
        reason: "Core tests must live under a __tests__ directory"
      });
      return;
    }

    if (relPath.includes("/__tests__/spec/")) {
      if (!/\.integration\.test\.ts$/.test(fileName)) {
        violations.push({
          path: relPath,
          reason: "Core spec tests must be named *.integration.test.ts"
        });
      }
      return;
    }

    if (relPath.includes("/__tests__/governance/")) {
      if (!/\.governance\.integration\.test\.ts$/.test(fileName)) {
        violations.push({
          path: relPath,
          reason: "Governance tests must be named *.governance.integration.test.ts"
        });
      }
      return;
    }

    if (!/\.unit\.test\.ts$/.test(fileName)) {
      violations.push({
        path: relPath,
        reason: "Core unit tests must be named *.unit.test.ts"
      });
    }
  });
}

function checkRuntimeTests() {
  const runtimeRoot = path.join(repoRoot, "packages", "runtime", "src");
  if (!fs.existsSync(runtimeRoot)) {
    return;
  }

  walk(runtimeRoot, (fullPath) => {
    const relPath = toPosix(path.relative(repoRoot, fullPath));
    const fileName = path.basename(fullPath);
    if (!/\.test\.ts$/.test(fileName)) {
      return;
    }

    const isInTestsDir = relPath.split("/").includes("__tests__");
    if (!isInTestsDir) {
      violations.push({
        path: relPath,
        reason: "Runtime tests must live under a __tests__ directory"
      });
      return;
    }

    if (!/\.unit\.test\.ts$/.test(fileName)) {
      violations.push({
        path: relPath,
        reason: "Runtime unit tests must be named *.unit.test.ts"
      });
    }
  });
}

checkGeneralTestNaming();
checkWebTests();
checkWebE2E();
checkCoreTests();
checkRuntimeTests();

if (violations.length > 0) {
  console.error("Test convention violations found:\n");
  for (const violation of violations) {
    console.error(`- ${violation.path}: ${violation.reason}`);
  }
  process.exit(1);
}

console.log("Test conventions check passed.");
