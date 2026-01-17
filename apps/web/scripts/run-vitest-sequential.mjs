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

const discoverySummary = () => {
  const previewLimit = 5;
  const summarize = (files) => files.map((file) => ` - ${path.relative(projectRoot, file)}`).join("\n");
  const summaryLines = [
    `Discovered ${testFiles.length} test file(s).`,
    "First files:",
    summarize(testFiles.slice(0, previewLimit)),
    "Last files:",
    summarize(testFiles.slice(Math.max(testFiles.length - previewLimit, 0)))
  ];

  const summaryText = summaryLines.join("\n");
  console.log("\n>> Test discovery audit:");
  console.log(summaryText);
  try {
    const reportDir = path.join(projectRoot, "test-results", "test-discovery");
    fs.mkdirSync(reportDir, { recursive: true });
    fs.writeFileSync(path.join(reportDir, "discovered.txt"), summaryText + "\n", "utf8");
  } catch (err) {
    console.warn("Failed to write test discovery report:", err);
  }
};

if (testFiles.length === 0) {
  console.error("No test files found. Check test conventions or discovery.");
  process.exit(1);
}

discoverySummary();

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
