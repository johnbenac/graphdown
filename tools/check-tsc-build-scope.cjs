#!/usr/bin/env node
/* eslint-disable no-console */
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const REPO_ROOT = path.resolve(__dirname, "..");
const PACKAGES_DIR = path.join(REPO_ROOT, "packages");

// Discover all packages with tsconfig.json
function discoverPackages() {
  if (!fs.existsSync(PACKAGES_DIR)) {
    return [];
  }
  const entries = fs.readdirSync(PACKAGES_DIR, { withFileTypes: true });
  const packages = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const pkgDir = path.join(PACKAGES_DIR, entry.name);
    const tsconfigPath = path.join(pkgDir, "tsconfig.json");
    if (fs.existsSync(tsconfigPath)) {
      packages.push({ name: entry.name, dir: pkgDir, tsconfig: tsconfigPath });
    }
  }
  return packages;
}

const packages = discoverPackages();
let hasErrors = false;

for (const pkg of packages) {
  const srcDir = path.join(pkg.dir, "src");
  if (!fs.existsSync(srcDir)) {
    continue;
  }

  // Check for legacy directory structure
  const legacyDirs = [
    path.join(srcDir, "tests"),
    path.join(srcDir, "fixtures")
  ];
  const existingLegacyDirs = legacyDirs.filter((dir) => fs.existsSync(dir));
  if (existingLegacyDirs.length > 0) {
    console.error(`Legacy layout detected in ${pkg.name}:`);
    existingLegacyDirs.forEach((dir) =>
      console.error(`  ${path.relative(REPO_ROOT, dir)}`)
    );
    console.error("Move tests to __tests__ and fixtures to __fixtures__.");
    hasErrors = true;
    continue;
  }

  // Check TypeScript build scope
  const res = spawnSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["tsc", "-p", path.relative(REPO_ROOT, pkg.tsconfig), "--noEmit", "--listFiles"],
    { encoding: "utf8", cwd: REPO_ROOT }
  );

  if (res.error) {
    console.error(`Error checking ${pkg.name}:`, res.error);
    hasErrors = true;
    continue;
  }

  const output = `${res.stdout}\n${res.stderr}`;
  const pkgPathPattern = `packages/${pkg.name}/src/`;

  // Check for test/fixture files in build output
  const forbiddenMatchers = [
    `/${pkgPathPattern}__tests__/`,
    `/${pkgPathPattern}__fixtures__/`,
    `/${pkgPathPattern}tests/`,
    `/${pkgPathPattern}fixtures/`
  ];

  const offending = output
    .split(/\r?\n/)
    .filter((line) => line.includes(pkgPathPattern))
    .filter((line) =>
      forbiddenMatchers.some((m) => line.replaceAll("\\", "/").includes(m))
    );

  if (offending.length > 0) {
    console.error(
      `Build scope violation in ${pkg.name}: TypeScript build is including test-only files:`
    );
    for (const line of offending) console.error(`  ${line}`);
    console.error(
      `\nFix: ensure ${path.relative(REPO_ROOT, pkg.tsconfig)} excludes __tests__ and __fixtures__.`
    );
    hasErrors = true;
  }
}

if (hasErrors) {
  process.exit(1);
}

console.log("Build scope check passed for all packages.");
process.exit(0);
