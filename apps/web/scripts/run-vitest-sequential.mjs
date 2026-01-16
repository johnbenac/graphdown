import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const srcRoot = path.join(projectRoot, "src");

const testFiles = [];

const isTestFile = (filePath) =>
  filePath.includes(`${path.sep}__tests__${path.sep}`) && /\.test\.(ts|tsx)$/.test(filePath);

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (entry.isFile() && isTestFile(fullPath)) {
      testFiles.push(fullPath);
    }
  }
}

walk(srcRoot);
testFiles.sort((a, b) => a.localeCompare(b));

if (testFiles.length === 0) {
  console.log("No test files found.");
  process.exit(0);
}

for (const file of testFiles) {
  const relative = path.relative(projectRoot, file);
  console.log(`\n>> vitest run ${relative}`);
  const result = spawnSync("npx", ["vitest", "run", relative], {
    cwd: projectRoot,
    stdio: "inherit",
    env: process.env
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
