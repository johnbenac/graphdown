const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const srcRoot = path.join(repoRoot, "apps", "web", "src");

const violations = [];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    const relPath = path.relative(repoRoot, fullPath);
    if (entry.name.endsWith(".spec.js")) {
      violations.push({
        path: relPath,
        reason: "Playwright specs are not allowed under apps/web/src"
      });
    }

    if (entry.name.match(/\.test\.[^.]+$/)) {
      const hasTestsDir = relPath.split(path.sep).includes("__tests__");
      if (!hasTestsDir) {
        violations.push({
          path: relPath,
          reason: "Vitest tests must live under a __tests__ directory"
        });
      }
    }
  }
}

if (!fs.existsSync(srcRoot)) {
  console.error(`Expected source directory not found: ${srcRoot}`);
  process.exit(1);
}

walk(srcRoot);

if (violations.length > 0) {
  console.error("Web test layout violations found:\n");
  for (const violation of violations) {
    console.error(`- ${violation.path}: ${violation.reason}`);
  }
  process.exit(1);
}

console.log("Web test layout check passed.");
