import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";

const require = createRequire(import.meta.url);
const { generateSpecTrace } = require("../../../../../tools/spec-trace.cjs");

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("spec trace matrix", () => {
  it("GOV-002: spec-trace output matches committed matrix", () => {
    const repoRoot = path.resolve(__dirname, "../../../../../");
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "spec-trace-"));
    let committed: { requirements?: unknown[]; missingTestable?: unknown[] } | undefined;
    let regenerated: { requirements?: unknown[]; missingTestable?: unknown[] } | undefined;
    let committedMd: string | undefined;
    let regeneratedMd: string | undefined;

    try {
      const result = generateSpecTrace({ outputDir: tempDir, writeFiles: true, generatedAt: "normalized" });
      regenerated = result.matrixData;
      const baselinePath = path.join(repoRoot, "artifacts", "spec-trace", "matrix.json");
      if (!fs.existsSync(baselinePath)) {
        throw new Error(
          'Baseline matrix artifact is missing. Run "npm run spec:trace" and commit artifacts/spec-trace/matrix.{json,md}.'
        );
      }
      const baselineMdPath = path.join(repoRoot, "artifacts", "spec-trace", "matrix.md");
      if (!fs.existsSync(baselineMdPath)) {
        throw new Error(
          'Baseline matrix markdown is missing. Run "npm run spec:trace" and commit artifacts/spec-trace/matrix.{json,md}.'
        );
      }

      committed = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
      if (committed) {
        committed.generatedAt = "normalized";
      }

      committedMd = fs.readFileSync(baselineMdPath, "utf8");
      regeneratedMd = fs.readFileSync(path.join(tempDir, "matrix.md"), "utf8");

      const normalizeMd = (text: string) => text.replace(/^Generated: .+$/m, "Generated: normalized");

      if (JSON.stringify(regenerated) !== JSON.stringify(committed)) {
        throw new Error("Spec trace JSON mismatch");
      }
      if (normalizeMd(regeneratedMd) !== normalizeMd(committedMd)) {
        throw new Error("Spec trace markdown mismatch");
      }
    } catch (error) {
      const err = error as Error;
      const context = {
        committedRequirements: committed?.requirements?.length,
        regeneratedRequirements: regenerated?.requirements?.length,
        committedMissingTestable: committed?.missingTestable?.length,
        regeneratedMissingTestable: regenerated?.missingTestable?.length
      };
      err.message = `spec-trace mismatch: ${err.message} | context=${JSON.stringify(context)}`;
      throw err;
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
