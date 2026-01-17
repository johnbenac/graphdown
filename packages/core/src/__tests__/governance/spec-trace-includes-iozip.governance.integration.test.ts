import assert from "node:assert/strict";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { test } from "vitest";

// tools/spec-trace.cjs is CommonJS; load via createRequire
const require = createRequire(import.meta.url);
const { generateSpecTrace } = require("../../../../../tools/spec-trace.cjs");

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("GOV-003: spec-trace includes io-zip requirement-tagged tests", () => {
  const result = generateSpecTrace({ writeFiles: false, generatedAt: "normalized" });
  const requirement = result.matrixData.requirements.find((req: any) => req.id === "IMP-PLUG-001");

  assert.ok(requirement, "Expected IMP-PLUG-001 to exist in the spec trace matrix.");

  const filePaths = requirement.tests.map((entry: any) => entry.filePath);

  assert.ok(
    filePaths.includes(
      "packages/io-zip/src/import/__tests__/readZipSnapshot.plugins.unit.test.ts",
    ),
    "Expected io-zip importer test to be included in spec trace matrix.",
  );
  assert.ok(
    filePaths.includes(
      "apps/web/src/import/github/__tests__/loadGitHubSnapshot.plugins.integration.test.ts",
    ),
    "Expected GitHub importer test to be included in spec trace matrix.",
  );
});
