#!/usr/bin/env node
/* eslint-disable no-console */
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const REPO_ROOT = path.resolve(__dirname, "..");
const legacyDirs = [
  path.join(REPO_ROOT, "packages", "core", "src", "tests"),
  path.join(REPO_ROOT, "packages", "core", "src", "fixtures"),
];

const existingLegacyDirs = legacyDirs.filter((dir) => fs.existsSync(dir));

if (existingLegacyDirs.length > 0) {
  console.error("Legacy core layout detected:");
  existingLegacyDirs.forEach((dir) =>
    console.error(`  ${path.relative(REPO_ROOT, dir)}`)
  );
  console.error("Move tests to __tests__ and fixtures to __fixtures__.");
  process.exit(1);
}

const res = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["tsc", "-p", "packages/core/tsconfig.json", "--noEmit", "--listFiles"],
  { encoding: "utf8" }
);

if (res.error) {
  console.error(res.error);
  process.exit(1);
}

const output = `${res.stdout}\n${res.stderr}`;

// Only care about our repo paths, not TS lib files.
const forbiddenMatchers = [
  "/packages/core/src/__tests__/",
  "/packages/core/src/__fixtures__/",
  "/packages/core/src/tests/",
  "/packages/core/src/fixtures/"
];

const offending = output
  .split(/\r?\n/)
  .filter((line) => line.includes("packages/core/src/"))
  .filter((line) =>
    forbiddenMatchers.some((m) => line.replaceAll("\\", "/").includes(m))
  );

if (offending.length > 0) {
  console.error(
    "Build scope violation: root TypeScript build is including test-only files:"
  );
  for (const line of offending) console.error(`  ${line}`);
  console.error(
    "\nFix: ensure packages/core/tsconfig.json excludes __tests__ and __fixtures__ under packages/core."
  );
  process.exit(1);
}

process.exit(res.status ?? 0);
