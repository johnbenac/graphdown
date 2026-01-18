import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "vitest";

// tools/spec-trace.cjs is CommonJS; load via createRequire
const require = createRequire(import.meta.url);
const { generateSpecTrace } = require("../../../../../tools/spec-trace.cjs");

const IO_TEST_PATH =
  "packages/io/src/selection/__tests__/selectSemanticSnapshotFiles.plugins.unit.test.ts";
const GITHUB_TEST_PATH =
  "apps/web/src/import/github/__tests__/loadGitHubSnapshot.plugins.integration.test.ts";

test("GOV-002: spec-trace includes io requirement-tagged tests", () => {
  const { matrixData } = generateSpecTrace({ writeFiles: false });
  const requirement = matrixData.requirements.find((req: { id: string }) => req.id === "IMP-PLUG-001");

  assert.ok(requirement, "IMP-PLUG-001 requirement missing from spec trace");

  const testPaths = requirement.tests.map((testEntry: { filePath: string }) => testEntry.filePath);
  assert.ok(
    testPaths.includes(IO_TEST_PATH),
    `Expected io test path in IMP-PLUG-001 tests. Got: ${testPaths.join(", ")}`,
  );
  assert.ok(
    testPaths.includes(GITHUB_TEST_PATH),
    `Expected GitHub test path in IMP-PLUG-001 tests. Got: ${testPaths.join(", ")}`,
  );
});
