#!/usr/bin/env node
/* eslint-disable no-console */
const { spawnSync } = require("node:child_process");

const res = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["tsc", "-p", "tsconfig.json", "--noEmit", "--listFiles"],
  { encoding: "utf8" }
);

if (res.error) {
  console.error(res.error);
  process.exit(1);
}

const output = `${res.stdout}\n${res.stderr}`;

// Only care about our repo paths, not TS lib files.
const forbiddenMatchers = [
  "/apps/web/src/graphdown/__tests__/",
  "/apps/web/src/graphdown/__fixtures__/"
];

const offending = output
  .split(/\r?\n/)
  .filter((line) => line.includes("apps/web/src/graphdown/"))
  .filter((line) =>
    forbiddenMatchers.some((m) => line.replaceAll("\\", "/").includes(m))
  );

if (offending.length > 0) {
  console.error(
    "Build scope violation: root TypeScript build is including test-only files:"
  );
  for (const line of offending) console.error(`  ${line}`);
  console.error(
    "\nFix: ensure tsconfig.json excludes __tests__ and __fixtures__ under graphdown."
  );
  process.exit(1);
}

process.exit(res.status ?? 0);
