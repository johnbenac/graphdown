import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "vitest";

const require = createRequire(import.meta.url);
const { generateSpecTrace } = require("../../../../../tools/spec-trace.cjs");

const IO_ZIP_TEST_PATH =
  "packages/io-zip/src/import/__tests__/readZipSnapshot.plugins.unit.test.ts";
const GITHUB_TEST_PATH =
  "apps/web/src/import/github/__tests__/loadGitHubSnapshot.plugins.integration.test.ts";

test("GOV-002: spec-trace includes io-zip requirement-tagged tests", () => {
  const { matrixData } = generateSpecTrace({ writeFiles: false });
  const requirement = matrixData.requirements.find(
    (req: { id: string }) => req.id === "IMP-PLUG-001",
  );

  assert.ok(requirement, "Expected IMP-PLUG-001 to exist in spec trace");

  const testPaths = requirement.tests.map((test: { filePath: string }) => test.filePath);

  assert.ok(
    testPaths.includes(IO_ZIP_TEST_PATH),
    `Expected ${IO_ZIP_TEST_PATH} to be included for IMP-PLUG-001`,
  );
  assert.ok(
    testPaths.includes(GITHUB_TEST_PATH),
    `Expected ${GITHUB_TEST_PATH} to be included for IMP-PLUG-001`,
  );
});
