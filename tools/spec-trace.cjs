const fs = require("fs");
const path = require("path");

const SPEC_PATH = path.join(process.cwd(), "SPEC.md");
const OUTPUT_DIR = path.join(process.cwd(), "artifacts", "spec-trace");
const TEST_TITLE_REGEX = /\b(?:it|test)\s*\(\s*(['"])(.*?)\1/g;
const REQUIREMENT_ID_REGEX = /\b[A-Z]{2,}(?:-[A-Z0-9]{2,})*-\d{3}\b/g;
const TEST_FILE_REGEX = /\.(test|spec)\.(c|m)?(j|t)sx?$/;
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "artifacts"]);

function readSpecRequirements() {
  const content = fs.readFileSync(SPEC_PATH, "utf8");
  const requirements = [];
  const requirementMap = new Map();
  const regex = /<!--\s*req:id=([A-Z0-9-]+)\s+title="([^"]+)"\s*-->/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const id = match[1];
    const title = match[2];
    requirements.push({ id, title });
    requirementMap.set(id, title);
  }

  return { requirements, requirementMap };
}

function collectTestFiles(startDirs) {
  const files = [];

  function walk(currentPath) {
    if (!fs.existsSync(currentPath)) {
      return;
    }
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) {
          continue;
        }
        walk(path.join(currentPath, entry.name));
        continue;
      }
      if (entry.isFile() && TEST_FILE_REGEX.test(entry.name)) {
        files.push(path.join(currentPath, entry.name));
      }
    }
  }

  for (const dir of startDirs) {
    walk(dir);
  }

  return files;
}

function extractReferencedRequirements(testFiles, requirementMap) {
  const referenced = new Map();
  const unknown = [];

  testFiles.forEach((filePath) => {
    const content = fs.readFileSync(filePath, "utf8");

    // Reset because TEST_TITLE_REGEX is global (/g) and carries lastIndex state.
    TEST_TITLE_REGEX.lastIndex = 0;

    let match;
    while ((match = TEST_TITLE_REGEX.exec(content)) !== null) {
      const title = match[2];
      const ids = title.match(REQUIREMENT_ID_REGEX);
      if (!ids) {
        continue;
      }

      ids.forEach((id) => {
        const entry = { id, title, file: path.relative(process.cwd(), filePath) };
        if (!requirementMap.has(id)) {
          unknown.push(entry);
          return;
        }
        if (!referenced.has(id)) {
          referenced.set(id, []);
        }
        referenced.get(id).push(entry);
      });
    }
  });

  return { referenced, unknown };
}

function writeOutputs(requirements, referenced, unknown) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const matrix = requirements.map((req) => ({
    ...req,
    tests: referenced.get(req.id) ?? [],
  }));

  const jsonOutput = {
    generatedAt: new Date().toISOString(),
    requirements: matrix,
    unknownIds: unknown,
  };

  fs.writeFileSync(
    path.join(OUTPUT_DIR, "matrix.json"),
    JSON.stringify(jsonOutput, null, 2)
  );

  const markdownLines = [
    "# Spec verification matrix",
    "",
    "| Requirement | Title | Tests |",
    "| --- | --- | --- |",
  ];

  matrix.forEach((req) => {
    const tests = req.tests.length
      ? req.tests
          .map((test) => `${test.title} (${test.file})`)
          .join("<br />")
      : "_None_";
    markdownLines.push(`| ${req.id} | ${req.title} | ${tests} |`);
  });

  fs.writeFileSync(path.join(OUTPUT_DIR, "matrix.md"), markdownLines.join("\n"));
}

function main() {
  const { requirements, requirementMap } = readSpecRequirements();
  const testFiles = collectTestFiles([
    path.join(process.cwd(), "tests"),
    path.join(process.cwd(), "apps", "web", "src"),
    path.join(process.cwd(), "apps", "web", "e2e"),
  ]);

  const { referenced, unknown } = extractReferencedRequirements(testFiles, requirementMap);
  writeOutputs(requirements, referenced, unknown);

  if (unknown.length > 0) {
    const errors = unknown
      .map((entry) => `${entry.id} in "${entry.title}" (${entry.file})`)
      .join("\n");
    console.error("Unknown requirement IDs referenced in tests:\n" + errors);
    process.exit(1);
  }
}

main();
