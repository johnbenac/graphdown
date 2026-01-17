import { describe, expect, it } from "vitest";

import { buildDatasetZipBytes, loadDatasetSnapshotFromZipBytes, readZipSnapshotFromBytes } from "../index";

const encoder = new TextEncoder();

describe("io-zip index", () => {
  it("exposes zip IO helpers", () => {
    expect(typeof buildDatasetZipBytes).toBe("function");
    expect(typeof loadDatasetSnapshotFromZipBytes).toBe("function");
    expect(typeof readZipSnapshotFromBytes).toBe("function");
  });

  it("roundtrips a simple dataset via index exports", () => {
    const snapshot = {
      files: new Map([
        ["types/note.md", encoder.encode("---\ntypeId: note\nfields: {}\n---\n")]
      ])
    };

    const zipBytes = buildDatasetZipBytes(snapshot);
    const loaded = loadDatasetSnapshotFromZipBytes(zipBytes);
    const bytes = loaded.files.get("types/note.md");
    expect(bytes).toBeDefined();
    expect(bytes).toEqual(snapshot.files.get("types/note.md"));
  });
});
