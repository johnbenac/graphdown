import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

describe("spec trace", () => {
  it("GOV-002: spec-trace output matches committed matrix", async () => {
    const testDir = path.dirname(fileURLToPath(import.meta.url));
    const repoRoot = path.resolve(testDir, "../../../../..");
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "spec-trace-"));
    let committed: unknown;
    let regenerated: unknown;
    let committedMd: string | undefined;
    let regeneratedMd: string | undefined;

    try {
      const { generateSpecTrace } = await import(
        pathToFileURL(path.join(repoRoot, "tools/spec-trace.cjs")).toString()
      );
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
      (committed as { generatedAt: string }).generatedAt = "normalized";

      committedMd = fs.readFileSync(baselineMdPath, "utf8");
      regeneratedMd = fs.readFileSync(path.join(tempDir, "matrix.md"), "utf8");

      const normalizeMd = (text: string) => text.replace(/^Generated: .+$/m, "Generated: normalized");

      expect(regenerated).toEqual(committed);
      expect(normalizeMd(regeneratedMd)).toBe(normalizeMd(committedMd));
    } catch (error) {
      const context = {
        committedRequirements: (committed as { requirements?: unknown[] })?.requirements?.length,
        regeneratedRequirements: (regenerated as { requirements?: unknown[] })?.requirements?.length,
        committedMissingTestable: (committed as { missingTestable?: unknown[] })?.missingTestable?.length,
        regeneratedMissingTestable: (regenerated as { missingTestable?: unknown[] })?.missingTestable?.length
      };
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`spec-trace mismatch: ${message} | context=${JSON.stringify(context)}`);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
