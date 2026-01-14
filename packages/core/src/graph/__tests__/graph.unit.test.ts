import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "vitest";

import { buildRecordLinkGraphFromSnapshot } from "../graph";
import type { BuildRecordLinkGraphResult } from "../graph";
import type { DatasetSnapshot } from "../../model/snapshotTypes";

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

function writeFile(root: string, relative: string, content: string): void {
  const full = path.join(root, relative);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
}

function typeFile(typeId: string): string {
  return ["---", `typeId: ${typeId}`, "fields: {}", "---", ""].join("\n");
}

function recordFile(typeId: string, recordId: string, body = "", extraFields = ""): string {
  return ["---", `typeId: ${typeId}`, `recordId: ${recordId}`, "fields: {}", extraFields, "---", body].join("\n");
}

function expectGraphOk(
  result: BuildRecordLinkGraphResult
): asserts result is Extract<BuildRecordLinkGraphResult, { ok: true }> {
  if (!result.ok) {
    const message = result.errors ? JSON.stringify(result.errors) : "Record Link Graph build failed";
    throw new Error(message);
  }
}

test('REL-002: extracts record links from bodies and fields', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "graphdown-graph-"));
  try {
    writeFile(tempDir, "types/note.md", typeFile("note"));
    writeFile(tempDir, "records/note-1.md", recordFile("note", "one", "See [[note:two]]."));
    writeFile(
      tempDir,
      "records/note-2.md",
      ["---", "typeId: note", "recordId: two", "fields:", '  ref: "[[note:one]]"', "---", "Backlink"].join("\n")
    );

    const result = buildRecordLinkGraphFromSnapshot(loadDatasetSnapshotFromFs(tempDir));
    expectGraphOk(result);
    const { graph: recordLinkGraph } = result;
    assert.deepEqual(recordLinkGraph.getOutgoingRecordLinks("note:one"), ["note:two"]);
    assert.deepEqual(recordLinkGraph.getIncomingRecordLinks("note:one"), ["note:two"]);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('REL-002: does not synthesize links across separate string values', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "graphdown-graph-"));
  try {
    writeFile(tempDir, "types/note.md", typeFile("note"));
    writeFile(
      tempDir,
      "records/note-1.md",
      ["---", "typeId: note", "recordId: one", "fields:", '  part1: "[[note:two"', '  part2: "]]"', "---", ""].join(
        "\n"
      )
    );
    writeFile(tempDir, "records/note-2.md", recordFile("note", "two"));

    const result = buildRecordLinkGraphFromSnapshot(loadDatasetSnapshotFromFs(tempDir));
    expectGraphOk(result);
    const { graph: recordLinkGraph } = result;
    assert.deepEqual(recordLinkGraph.getOutgoingRecordLinks("note:one"), []);
    assert.deepEqual(recordLinkGraph.getIncomingRecordLinks("note:two"), []);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('Record Link Graph exposes type and record lookup by identity', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "graphdown-graph-"));
  try {
    writeFile(tempDir, "t.md", typeFile("note"));
    writeFile(tempDir, "r.md", recordFile("note", "one"));

    const result = buildRecordLinkGraphFromSnapshot(loadDatasetSnapshotFromFs(tempDir));
    expectGraphOk(result);
    const { graph: recordLinkGraph } = result;
    const type = recordLinkGraph.getType("note");
    assert.ok(type);
    const record = recordLinkGraph.getRecord("note:one");
    assert.ok(record);
    assert.equal(recordLinkGraph.getTypeForRecord("note:one")?.typeId, "note");
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('VAL-002: duplicate record identity fails Record Link Graph build', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "graphdown-graph-"));
  try {
    writeFile(tempDir, "t.md", typeFile("note"));
    const content = recordFile("note", "one");
    writeFile(tempDir, "r1.md", content);
    writeFile(tempDir, "r2.md", content);

    const result = buildRecordLinkGraphFromSnapshot(loadDatasetSnapshotFromFs(tempDir));
    if (result.ok) {
      assert.fail("Expected duplicate ID error");
    }
    assert.ok(result.errors.some((e) => e.code === "E_DUPLICATE_ID"));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
