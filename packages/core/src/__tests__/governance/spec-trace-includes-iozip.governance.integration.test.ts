import assert from "node:assert/strict";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { test } from "vitest";

// tools/spec-trace.cjs is CommonJS; load via createRequire
const require = createRequire(import.meta.url);
const { generateSpecTrace } = require("../../../../../tools/spec-trace.cjs");

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("GOV-002: spec-trace includes io-zip requirement-tagged tests", () => {
  const { matrixData } = generateSpecTrace({ writeFiles: false });
  const requirement = matrixData.requirements.find(
    (req: { id: string }) => req.id === "IMP-PLUG-001"
  );

  assert.ok(requirement, "Missing requirement IMP-PLUG-001 in spec-trace output.");

  const testPaths = requirement.tests.map((entry: { filePath: string }) => entry.filePath);

  assert.ok(
    testPaths.includes(
      "packages/io-zip/src/import/__tests__/readZipSnapshot.plugins.unit.test.ts"
    ),
    "Expected io-zip IMP-PLUG-001 test to be included in spec-trace output."
  );
  assert.ok(
    testPaths.includes(
      "apps/web/src/import/github/__tests__/loadGitHubSnapshot.plugins.integration.test.ts"
    ),
    "Expected GitHub IMP-PLUG-001 test to be included in spec-trace output."
  );
});
