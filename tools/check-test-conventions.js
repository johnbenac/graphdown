const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");

const violations = [];

const testFileRegex = /\.(test|spec)\.(ts|tsx|js|jsx)$/;
const unitOrIntegrationRegex = /\.(unit|integration)\.test\.(ts|tsx)$/;
const nfrUnitOrIntegrationRegex = /\.nfr\.(unit|integration)\.test\.(ts|tsx)$/;

function walk(dir, onFile) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, onFile);
    } else if (entry.isFile()) {
      onFile(fullPath);
    }
  }
}

function addViolation(fullPath, reason) {
  violations.push({
    path: path.relative(repoRoot, fullPath),
    reason
  });
}

function checkCore() {
  const coreRoot = path.join(repoRoot, "packages", "core", "src");
  if (!fs.existsSync(coreRoot)) {
    addViolation(coreRoot, "Core source directory not found");
    return;
  }

  walk(coreRoot, (fullPath) => {
    if (!testFileRegex.test(fullPath)) {
      return;
    }

    const relPath = path.relative(coreRoot, fullPath);
    const normalized = relPath.split(path.sep).join("/");

    if (!normalized.includes("__tests__/")) {
      addViolation(fullPath, "Core tests must live under a __tests__ directory");
      return;
    }

    if (normalized.includes("__tests__/spec/")) {
      if (!/\.integration\.test\.ts$/.test(fullPath)) {
        addViolation(fullPath, "Core spec tests must be named *.integration.test.ts");
      }
      return;
    }

    if (normalized.includes("__tests__/governance/")) {
      if (!/\.(governance\.)?integration\.test\.ts$/.test(fullPath)) {
        addViolation(fullPath, "Core governance tests must be named *.governance.integration.test.ts");
      }
      return;
    }

    if (!/\.unit\.test\.ts$/.test(fullPath)) {
      addViolation(fullPath, "Core unit tests must be named *.unit.test.ts");
    }
  });
}

function checkWeb() {
  const webSrcRoot = path.join(repoRoot, "apps", "web", "src");
  const webE2eRoot = path.join(repoRoot, "apps", "web", "e2e");

  if (!fs.existsSync(webSrcRoot)) {
    addViolation(webSrcRoot, "Web source directory not found");
  } else {
    walk(webSrcRoot, (fullPath) => {
      if (!testFileRegex.test(fullPath)) {
        return;
      }

      const relPath = path.relative(webSrcRoot, fullPath);
      const normalized = relPath.split(path.sep).join("/");

      if (normalized.includes(".spec.")) {
        addViolation(fullPath, "Playwright specs are not allowed under apps/web/src");
        return;
      }

      if (!normalized.includes("__tests__/")) {
        addViolation(fullPath, "Web tests must live under a __tests__ directory");
        return;
      }

      if (!unitOrIntegrationRegex.test(fullPath) && !nfrUnitOrIntegrationRegex.test(fullPath)) {
        addViolation(fullPath, "Web tests must be named *.unit.test.* or *.integration.test.*");
      }
    });
  }

  if (!fs.existsSync(webE2eRoot)) {
    addViolation(webE2eRoot, "Web E2E directory not found");
  } else {
    walk(webE2eRoot, (fullPath) => {
      if (!/\.spec\.(js|ts)$/.test(fullPath) && !/\.test\.(js|ts)$/.test(fullPath)) {
        return;
      }

      if (!/\.e2e\.spec\.(js|ts)$/.test(fullPath)) {
        addViolation(fullPath, "E2E tests must be named *.e2e.spec.(js|ts)");
      }
    });
  }
}

checkCore();
checkWeb();

if (violations.length > 0) {
  console.error("Test convention violations found:\n");
  for (const violation of violations) {
    console.error(`- ${violation.path}: ${violation.reason}`);
  }
  process.exit(1);
}

console.log("Test convention check passed.");
