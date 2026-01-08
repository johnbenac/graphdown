const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const webSrcRoot = path.join(repoRoot, "apps", "web", "src");

function walk(dir, visitor) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(entryPath, visitor);
    } else if (entry.isFile()) {
      visitor(entryPath);
    }
  }
}

const invalidTests = [];
const specJsFiles = [];

walk(webSrcRoot, (filePath) => {
  const relativePath = path.relative(repoRoot, filePath);
  const isTestFile = /\.test\.[^/]+$/.test(relativePath);
  const inTestsDir = relativePath.split(path.sep).includes("__tests__");
  const isSpecJs = relativePath.endsWith(".spec.js");

  if (isTestFile && !inTestsDir) {
    invalidTests.push(relativePath);
  }

  if (isSpecJs) {
    specJsFiles.push(relativePath);
  }
});

if (invalidTests.length || specJsFiles.length) {
  console.error("Invalid test placement detected:");
  if (invalidTests.length) {
    console.error("\nTests outside __tests__ directories:");
    for (const testPath of invalidTests) {
      console.error(`- ${testPath}`);
    }
  }
  if (specJsFiles.length) {
    console.error("\nPlaywright-style *.spec.js files are not allowed in apps/web/src:");
    for (const specPath of specJsFiles) {
      console.error(`- ${specPath}`);
    }
  }
  process.exit(1);
}

console.log("Web test placement check passed.");
