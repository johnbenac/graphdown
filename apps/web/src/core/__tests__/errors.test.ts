import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "vitest";

import { validateDatasetSnapshot } from "../../core";
import type { DatasetSnapshot } from "../../core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadDatasetSnapshotFromFs(root: string): DatasetSnapshot {
  const files = new Map<string, Uint8Array>();

  const walk = (dir: string): void => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === ".git") {
        continue;
      }
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        const relPath = path.relative(root, fullPath).split(path.sep).join("/");
        const contents = fs.readFileSync(fullPath);
        files.set(relPath, contents);
      }
    }
  };

  walk(root);
  return { files };
}

test('ERR-001: validation errors expose stable fields', () => {
  const snapshot = loadDatasetSnapshotFromFs(path.join(__dirname, '..', '__fixtures__', 'invalid-dataset'));

  const result = validateDatasetSnapshot(snapshot);
  if (result.ok) {
    assert.fail("Expected validation errors");
  }
  const { errors } = result;
  assert.ok(Array.isArray(errors));
  assert.ok(errors.length > 0);
  for (const error of errors) {
    assert.equal(typeof error.code, "string");
    assert.equal(typeof error.message, "string");
    assert.ok(Object.prototype.hasOwnProperty.call(error, "file"));
    assert.ok(Object.prototype.hasOwnProperty.call(error, "hint"));
  }
});
