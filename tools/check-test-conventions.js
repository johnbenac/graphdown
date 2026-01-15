const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

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

const PROD_EXTS = [".ts", ".tsx", ".js", ".jsx", ".mts", ".cts"];

const violations = [];
const colocationViolations = [];
const importScopeViolations = [];

// Load configuration
const defaultConfigPath = path.join(repoRoot, "tools", "test-conventions", "config.json");
const configPath = process.env.GD_TEST_CONVENTIONS_CONFIG ?? defaultConfigPath;

let config = { version: 1, colocationAllowlist: {} };
if (fs.existsSync(configPath)) {
  try {
    config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    validateConfig(config);
  } catch (err) {
    console.error(`Failed to load config from ${configPath}:`);
    console.error(err.message);
    process.exit(1);
  }
} else {
  console.warn(`Warning: Config file not found at ${configPath}, using empty allowlist`);
}

function validateConfig(cfg) {
  if (cfg.version !== 1) {
    throw new Error(`Unsupported config version: ${cfg.version}. Expected version 1.`);
  }

  if (!cfg.colocationAllowlist || typeof cfg.colocationAllowlist !== "object") {
    throw new Error("Config must have 'colocationAllowlist' object");
  }

  const now = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  for (const [packageName, areas] of Object.entries(cfg.colocationAllowlist)) {
    if (typeof areas !== "object") {
      throw new Error(`Package '${packageName}' allowlist must be an object`);
    }

    for (const [areaName, metadata] of Object.entries(areas)) {
      const location = `${packageName}/${areaName}`;

      if (!metadata || typeof metadata !== "object") {
        throw new Error(`Allowlist entry for ${location} must be an object with metadata`);
      }

      const required = ["reason", "issue", "owner", "expires"];
      for (const field of required) {
        if (!metadata[field] || typeof metadata[field] !== "string") {
          throw new Error(
            `Allowlist entry for ${location} missing required field: '${field}'`
          );
        }
      }

      // Check expiration
      const expires = metadata.expires;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(expires)) {
        throw new Error(
          `Allowlist entry for ${location} has invalid 'expires' format. Expected YYYY-MM-DD, got: ${expires}`
        );
      }

      if (expires < now) {
        throw new Error(
          `Allowlist entry for ${location} has expired (${expires}).\n` +
          `  Reason: ${metadata.reason}\n` +
          `  Owner: ${metadata.owner}\n` +
          `  Issue: ${metadata.issue}\n\n` +
          `Please either:\n` +
          `  1. Remove the allowlist entry if tests have been added\n` +
          `  2. Extend the expiration date with updated justification\n` +
          `  3. Use a far-future date (e.g., 2099-12-31) for permanent exceptions`
        );
      }
    }
  }
}

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

function parseImportDeclarations(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(
    filePath,
    text,
    ts.ScriptTarget.Latest,
    /*setParentNodes*/ false
  );

  const imports = [];
  for (const stmt of sourceFile.statements) {
    if (!ts.isImportDeclaration(stmt)) continue;
    if (!ts.isStringLiteral(stmt.moduleSpecifier)) continue;

    const spec = stmt.moduleSpecifier.text;
    const clause = stmt.importClause;
    if (!clause) continue;

    // Check if entire import is type-only
    let isTypeOnly = clause.isTypeOnly === true;

    // Check for per-specifier type-only imports: import { type Foo } from "..."
    if (!isTypeOnly && clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
      const elems = clause.namedBindings.elements;
      const hasValue = elems.some((e) => e.isTypeOnly !== true);
      isTypeOnly = !hasValue;
    }

    imports.push({ spec, isTypeOnly });
  }
  return imports;
}

function resolveRelativeImport(fromFile, spec) {
  const fromDir = path.dirname(fromFile);
  let candidate = path.resolve(fromDir, spec);

  // If spec ends in .js but source is .ts, try swapping
  if (!fs.existsSync(candidate) && candidate.endsWith(".js")) {
    const tsCandidate = candidate.replace(/\.js$/, ".ts");
    if (fs.existsSync(tsCandidate)) return tsCandidate;
  }

  // Exact file path
  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
    return candidate;
  }

  // Try extensions
  for (const ext of PROD_EXTS) {
    const withExt = candidate + ext;
    if (fs.existsSync(withExt) && fs.statSync(withExt).isFile()) {
      return withExt;
    }
  }

  // Directory import -> index.*
  if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
    for (const ext of PROD_EXTS) {
      const indexFile = path.join(candidate, "index" + ext);
      if (fs.existsSync(indexFile) && fs.statSync(indexFile).isFile()) {
        return indexFile;
      }
    }
  }

  return null;
}

function isTestOrFixturePath(relPosixPath) {
  const parts = relPosixPath.split("/");
  return parts.includes("__tests__") || parts.includes("__fixtures__");
}

function normalizeAreaToTopLevel(relPath) {
  // Area is the top-level directory extracted from a path
  // For file paths (contains extension): first directory or "" if at root
  // For directory paths (no extension): first directory or "" if empty
  //
  // Examples:
  //   "" → ""
  //   "index.ts" → ""  (root-level file)
  //   "errors.ts" → ""  (root-level file)
  //   "parse" → "parse"  (directory name)
  //   "parse/datasetObjects.ts" → "parse"
  //   "parse/github" → "parse"  (nested directory)
  //   "parse/github/foo.ts" → "parse"
  if (relPath === "") return "";

  const parts = relPath.split("/");

  // Single segment could be either a root-level file or a top-level directory
  // Distinguish by checking if it looks like a filename (has extension)
  if (parts.length === 1) {
    // If it has a file extension, it's a root-level file
    if (/\.(ts|tsx|js|jsx|mts|cts)$/.test(parts[0])) {
      return "";
    }
    // Otherwise it's a directory name
    return parts[0];
  }

  // Multiple segments - first is always the area
  return parts[0];
}

function getUnitTestAreaRelPath(packageSrcRoot, testFileFullPath) {
  const rel = toPosix(path.relative(packageSrcRoot, testFileFullPath));
  const parts = rel.split("/");
  const idx = parts.indexOf("__tests__");
  if (idx === -1) return null;
  const rawArea = parts.slice(0, idx).join("/");
  return normalizeAreaToTopLevel(rawArea);
}

function enforceUnitTestColocationByImports(packageName, packageSrcRoot, testFileFullPath) {
  const areaRel = getUnitTestAreaRelPath(packageSrcRoot, testFileFullPath);
  if (areaRel == null) return;

  const imports = parseImportDeclarations(testFileFullPath);

  for (const imp of imports) {
    // Only enforce for relative, value imports
    if (!imp.spec.startsWith(".")) continue;
    if (imp.isTypeOnly) continue;

    const resolved = resolveRelativeImport(testFileFullPath, imp.spec);
    if (!resolved) continue;

    const resolvedRel = toPosix(path.relative(packageSrcRoot, resolved));

    // Ignore anything outside the package src root
    if (resolvedRel.startsWith("..")) continue;

    // Ignore test helpers / fixtures
    if (isTestOrFixturePath(resolvedRel)) continue;

    // Normalize resolved path to top-level area
    const resolvedArea = normalizeAreaToTopLevel(resolvedRel);

    // Enforce "same area"
    if (areaRel !== resolvedArea) {
      const testAreaDisplay = areaRel === "" ? "(root)" : areaRel;
      const resolvedAreaDisplay = resolvedArea === "" ? "(root)" : resolvedArea;

      importScopeViolations.push({
        testFile: toPosix(path.relative(repoRoot, testFileFullPath)),
        importSpec: imp.spec,
        resolvedPath: resolvedRel,
        testArea: testAreaDisplay,
        resolvedArea: resolvedAreaDisplay,
        reason: `Unit test in area '${testAreaDisplay}' imports production code from area '${resolvedAreaDisplay}'`
      });
    }
  }
}

function checkPackageColocationCompleteness(packageName) {
  const packageRoot = path.join(repoRoot, "packages", packageName, "src");
  if (!fs.existsSync(packageRoot)) {
    return;
  }

  const packageAllowlist = config.colocationAllowlist[packageName] || {};
  const areasWithProdCode = new Set();
  const areasWithTests = new Set();

  // Walk the package and find all areas with production code
  walk(packageRoot, (fullPath) => {
    const relPath = toPosix(path.relative(packageRoot, fullPath));

    // Skip test/fixture files
    if (isTestOrFixturePath(relPath)) return;

    // Only consider production source files
    if (!/\.(ts|tsx|js|jsx|mts|cts)$/.test(fullPath)) return;

    const area = normalizeAreaToTopLevel(relPath);
    areasWithProdCode.add(area);
  });

  // Find all areas with __tests__ directories
  walk(packageRoot, (fullPath) => {
    const relPath = toPosix(path.relative(packageRoot, fullPath));

    if (!relPath.includes("__tests__")) return;
    if (!/\.unit\.test\.(ts|tsx)$/.test(fullPath)) return;

    const parts = relPath.split("/");
    const testsIdx = parts.indexOf("__tests__");
    const rawArea = testsIdx === 0 ? "" : parts.slice(0, testsIdx).join("/");
    const area = normalizeAreaToTopLevel(rawArea);
    areasWithTests.add(area);
  });

  // Check for areas with production code but no tests
  for (const area of areasWithProdCode) {
    if (areasWithTests.has(area)) continue;

    // Check allowlist
    if (packageAllowlist[area]) {
      // Area is allowlisted - optionally check if it now has tests
      if (areasWithTests.has(area)) {
        const metadata = packageAllowlist[area];
        console.warn(
          `Warning: ${packageName}/${area} is allowlisted but now has tests. ` +
          `Consider removing from allowlist (issue: ${metadata.issue})`
        );
      }
      continue;
    }

    const areaDisplay = area === "" ? "(root)" : area;
    const expectedPath = area === ""
      ? `packages/${packageName}/src/__tests__/`
      : `packages/${packageName}/src/${area}/__tests__/`;

    colocationViolations.push({
      package: packageName,
      area: areaDisplay,
      expectedPath,
      reason: `Area contains production code but no co-located __tests__/ directory with *.unit.test.ts files`
    });
  }
}

function checkPackageTests(packageName) {
  const packageRoot = path.join(repoRoot, "packages", packageName, "src");
  if (!fs.existsSync(packageRoot)) {
    return;
  }

  walk(packageRoot, (fullPath) => {
    const relPath = toPosix(path.relative(repoRoot, fullPath));
    const fileName = path.basename(fullPath);
    if (!/\.test\.ts$/.test(fileName)) {
      return;
    }

    const isInTestsDir = relPath.split("/").includes("__tests__");
    if (!isInTestsDir) {
      violations.push({
        path: relPath,
        reason: `${packageName} tests must live under a __tests__ directory`
      });
      return;
    }

    if (relPath.includes("/__tests__/spec/")) {
      if (!/\.integration\.test\.ts$/.test(fileName)) {
        violations.push({
          path: relPath,
          reason: `${packageName} spec tests must be named *.integration.test.ts`
        });
      }
      return;
    }

    if (relPath.includes("/__tests__/governance/")) {
      if (!/\.governance\.integration\.test\.ts$/.test(fileName)) {
        violations.push({
          path: relPath,
          reason: `${packageName} governance tests must be named *.governance.integration.test.ts`
        });
      }
      return;
    }

    if (!/\.unit\.test\.ts$/.test(fileName)) {
      violations.push({
        path: relPath,
        reason: `${packageName} unit tests must be named *.unit.test.ts`
      });
      return;
    }

    // Enforce import scope for unit tests
    enforceUnitTestColocationByImports(packageName, packageRoot, fullPath);
  });
}

function discoverLibraryPackages() {
  const packagesDir = path.join(repoRoot, "packages");
  if (!fs.existsSync(packagesDir)) {
    return [];
  }
  return fs.readdirSync(packagesDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name);
}

function renderMarkdownSummary(report) {
  let md = "## Test Convention Violations\n\n";
  md += `**Total violations:** ${report.summary.total}\n\n`;

  if (report.violations.naming.length > 0) {
    md += `### Naming Violations (${report.violations.naming.length})\n\n`;
    for (const v of report.violations.naming) {
      md += `- \`${v.path}\`: ${v.reason}\n`;
    }
    md += "\n";
  }

  if (report.violations.importScope.length > 0) {
    md += `### Import Scope Violations (${report.violations.importScope.length})\n\n`;
    for (const v of report.violations.importScope) {
      md += `- \`${v.testFile}\`\n`;
      md += `  - Area: \`${v.testArea}\`\n`;
      md += `  - Import: \`${v.importSpec}\` → \`${v.resolvedArea}\`\n`;
      md += `  - ${v.reason}\n\n`;
    }
  }

  if (report.violations.colocation.length > 0) {
    md += `### Colocation Completeness Violations (${report.violations.colocation.length})\n\n`;
    for (const v of report.violations.colocation) {
      md += `- \`${v.package}/${v.area}\`: ${v.reason}\n`;
      md += `  - Expected: \`${v.expectedPath}\`\n\n`;
    }
  }

  return md;
}

checkGeneralTestNaming();
checkWebTests();
checkWebE2E();

// Check all library packages (core, runtime, etc.)
const libraryPackages = discoverLibraryPackages();
for (const packageName of libraryPackages) {
  checkPackageTests(packageName);
  checkPackageColocationCompleteness(packageName);
}

// Generate verbose failure report if there are any violations
const hasViolations = violations.length > 0 || importScopeViolations.length > 0 || colocationViolations.length > 0;

if (hasViolations) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      namingViolations: violations.length,
      importScopeViolations: importScopeViolations.length,
      colocationViolations: colocationViolations.length,
      total: violations.length + importScopeViolations.length + colocationViolations.length
    },
    violations: {
      naming: violations,
      importScope: importScopeViolations,
      colocation: colocationViolations
    }
  };

  // Determine if we should write JSON report
  const reportPath = process.env.GD_TEST_CONVENTIONS_REPORT_PATH ||
    (process.env.CI ? path.join(repoRoot, "test-results", "test-conventions", "violations.json") : null);

  if (reportPath) {
    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  }

  // Write GitHub job summary if in GitHub Actions
  if (process.env.GITHUB_STEP_SUMMARY) {
    try {
      const summary = renderMarkdownSummary(report);
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
    } catch (err) {
      console.error("Failed to write GitHub step summary:", err.message);
    }
  }

  // Console output
  console.error("╔════════════════════════════════════════════════════════════════════════════╗");
  console.error("║                    TEST CONVENTION VIOLATIONS DETECTED                     ║");
  console.error("╚════════════════════════════════════════════════════════════════════════════╝\n");

  console.error(`Summary: ${report.summary.total} violation(s) found\n`);

  if (violations.length > 0) {
    console.error("┌─ NAMING VIOLATIONS (" + violations.length + ")");
    console.error("│  Test files must follow naming conventions\n│");
    for (const violation of violations) {
      console.error(`│  ✗ ${violation.path}`);
      console.error(`│    → ${violation.reason}\n│`);
    }
    console.error("└─\n");
  }

  if (importScopeViolations.length > 0) {
    console.error("┌─ IMPORT SCOPE VIOLATIONS (" + importScopeViolations.length + ")");
    console.error("│  Unit tests must only import production code from their own area\n│");
    for (const violation of importScopeViolations) {
      console.error(`│  ✗ ${violation.testFile}`);
      console.error(`│    Test area: ${violation.testArea}`);
      console.error(`│    Import: ${violation.importSpec}`);
      console.error(`│    Resolves to: ${violation.resolvedPath} (area: ${violation.resolvedArea})`);
      console.error(`│    → ${violation.reason}\n│`);
    }
    console.error("└─\n");
  }

  if (colocationViolations.length > 0) {
    console.error("┌─ COLOCATION COMPLETENESS VIOLATIONS (" + colocationViolations.length + ")");
    console.error("│  Areas with production code must have co-located __tests__/ directories\n│");
    for (const violation of colocationViolations) {
      console.error(`│  ✗ ${violation.package}/${violation.area}`);
      console.error(`│    Expected: ${violation.expectedPath}`);
      console.error(`│    → ${violation.reason}\n│`);
    }
    console.error("└─\n");
  }

  if (reportPath) {
    console.error("Detailed JSON report written to: " + path.relative(repoRoot, reportPath));
  }
  console.error("\nTo exempt an area from colocation requirements, add it to tools/test-conventions/config.json");
  console.error("See tools/test-conventions/README.md for schema and examples.");
  console.error("\nTo fix import scope violations, either:");
  console.error("  1. Move the test to the same area as the code it imports");
  console.error("  2. Change the import to 'import type' if only types are needed");
  console.error("  3. Rename the test to *.integration.test.ts if it genuinely spans areas\n");

  process.exit(1);
}

console.log("✓ Test conventions check passed.");
