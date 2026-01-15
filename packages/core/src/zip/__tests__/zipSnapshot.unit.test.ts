import assert from "node:assert/strict";
import { test } from "vitest";
import { zipSync } from "fflate";

import { buildZipBytesFromSnapshot, loadDatasetSnapshotFromZipBytes } from "../zipSnapshot";

const enc = new TextEncoder();
const bytes = (s: string) => enc.encode(s);

test("zip snapshot roundtrips files", () => {
  const snapshot = {
    files: new Map<string, Uint8Array>([
      ["types/note.md", bytes("---\ntypeId: note\nfields: {}\n---\n")],
      ["records/note-one.md", bytes("---\ntypeId: note\nrecordId: one\nfields: {}\n---\nBody\n")]
    ])
  };

  const zipBytes = buildZipBytesFromSnapshot(snapshot);
  const loaded = loadDatasetSnapshotFromZipBytes(zipBytes);

  assert.equal(loaded.files.size, 2);
  assert.deepEqual(loaded.files.get("types/note.md"), snapshot.files.get("types/note.md"));
  assert.deepEqual(loaded.files.get("records/note-one.md"), snapshot.files.get("records/note-one.md"));
});

test("buildZipBytesFromSnapshot excludes .git by default", () => {
  const snapshot = {
    files: new Map<string, Uint8Array>([
      [".git/config", bytes("nope")],
      ["types/note.md", bytes("---\ntypeId: note\nfields: {}\n---\n")]
    ])
  };

  const zipBytes = buildZipBytesFromSnapshot(snapshot);
  const loaded = loadDatasetSnapshotFromZipBytes(zipBytes);

  assert.equal(loaded.files.has(".git/config"), false);
  assert.equal(loaded.files.has("types/note.md"), true);
});

test("loadDatasetSnapshotFromZipBytes normalizes backslashes", () => {
  const zipBytes = zipSync({ "a\\b.txt": bytes("hi") }, { level: 0 });
  const loaded = loadDatasetSnapshotFromZipBytes(zipBytes);
  assert.equal(loaded.files.has("a/b.txt"), true);
});

test("loadDatasetSnapshotFromZipBytes rejects .. paths", () => {
  const zipBytes = zipSync({ "../evil.txt": bytes("no") }, { level: 0 });
  assert.throws(() => loadDatasetSnapshotFromZipBytes(zipBytes), /Invalid zip entry path/);
});
