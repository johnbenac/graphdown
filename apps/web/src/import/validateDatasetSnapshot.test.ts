import { describe, expect, it } from "vitest";
import type { RepoSnapshot } from "../../../../src/core/snapshotTypes";
import { validateDatasetSnapshot } from "../../../../src/core/validateDatasetSnapshot";

const encoder = new TextEncoder();

function snapshotFromFiles(files: Record<string, string>): RepoSnapshot {
  return {
    files: new Map(
      Object.entries(files).map(([path, contents]) => [path, encoder.encode(contents)])
    )
  };
}

function validSnapshot(): RepoSnapshot {
  return snapshotFromFiles({
    "datasets/dataset--demo.md": `---\nid: \"dataset:demo\"\ndatasetId: \"dataset:demo\"\ntypeId: \"sys:dataset\"\ncreatedAt: \"2024-01-01T00:00:00Z\"\nupdatedAt: \"2024-01-01T00:00:00Z\"\nfields:\n  name: \"Demo\"\n  description: \"Demo dataset\"\n---\n`,
    "types/type--note.md": `---\nid: \"type:note\"\ndatasetId: \"dataset:demo\"\ntypeId: \"sys:type\"\ncreatedAt: \"2024-01-01T00:00:00Z\"\nupdatedAt: \"2024-01-01T00:00:00Z\"\nfields:\n  recordTypeId: \"note\"\n---\n`,
    "records/note/record--1.md": `---\nid: \"note:1\"\ndatasetId: \"dataset:demo\"\ntypeId: \"note\"\ncreatedAt: \"2024-01-01T00:00:00Z\"\nupdatedAt: \"2024-01-01T00:00:00Z\"\nfields:\n  title: \"Hello\"\n---\n`
  });
}

describe("validateDatasetSnapshot", () => {
  it("flags missing directories", () => {
    const result = validateDatasetSnapshot(snapshotFromFiles({}));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((error) => error.code === "E_DIR_MISSING")).toBe(true);
    }
  });

  it("flags dataset file count errors", () => {
    const snapshot = snapshotFromFiles({
      "datasets/a.md": `---\nid: \"dataset:demo\"\n---\n`,
      "datasets/b.md": `---\nid: \"dataset:demo\"\n---\n`,
      "types/type--note.md": `---\nid: \"type:note\"\ndatasetId: \"dataset:demo\"\ntypeId: \"sys:type\"\ncreatedAt: \"2024-01-01T00:00:00Z\"\nupdatedAt: \"2024-01-01T00:00:00Z\"\nfields:\n  recordTypeId: \"note\"\n---\n`,
      "records/note/record--1.md": `---\nid: \"note:1\"\ndatasetId: \"dataset:demo\"\ntypeId: \"note\"\ncreatedAt: \"2024-01-01T00:00:00Z\"\nupdatedAt: \"2024-01-01T00:00:00Z\"\nfields:\n  title: \"Hello\"\n---\n`
    });
    const result = validateDatasetSnapshot(snapshot);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.code).toBe("E_DATASET_FILE_COUNT");
    }
  });

  it("flags missing front matter", () => {
    const snapshot = validSnapshot();
    snapshot.files.set("datasets/dataset--demo.md", encoder.encode("no front matter"));
    const result = validateDatasetSnapshot(snapshot);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.code).toBe("E_FRONT_MATTER_MISSING");
    }
  });

  it("flags invalid YAML", () => {
    const snapshot = validSnapshot();
    snapshot.files.set("datasets/dataset--demo.md", encoder.encode("---\nname: [\n---"));
    const result = validateDatasetSnapshot(snapshot);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.code).toBe("E_YAML_INVALID");
    }
  });

  it("flags dataset id prefix errors", () => {
    const snapshot = validSnapshot();
    snapshot.files.set(
      "datasets/dataset--demo.md",
      encoder.encode(`---\nid: \"demo\"\ndatasetId: \"demo\"\ntypeId: \"sys:dataset\"\ncreatedAt: \"2024-01-01T00:00:00Z\"\nupdatedAt: \"2024-01-01T00:00:00Z\"\nfields:\n  name: \"Demo\"\n  description: \"Demo dataset\"\n---`)
    );
    const result = validateDatasetSnapshot(snapshot);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((error) => error.code === "E_ID_PREFIX_INVALID")).toBe(true);
    }
  });

  it("flags dataset fields missing", () => {
    const snapshot = validSnapshot();
    snapshot.files.set(
      "datasets/dataset--demo.md",
      encoder.encode(`---\nid: \"dataset:demo\"\ndatasetId: \"dataset:demo\"\ntypeId: \"sys:dataset\"\ncreatedAt: \"2024-01-01T00:00:00Z\"\nupdatedAt: \"2024-01-01T00:00:00Z\"\nfields:\n  name: \"Demo\"\n---`)
    );
    const result = validateDatasetSnapshot(snapshot);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((error) => error.code === "E_DATASET_FIELDS_MISSING")).toBe(true);
    }
  });

  it("flags unknown record directories", () => {
    const snapshot = validSnapshot();
    snapshot.files.set(
      "records/unknown/record--1.md",
      encoder.encode(`---\nid: \"unknown:1\"\ndatasetId: \"dataset:demo\"\ntypeId: \"unknown\"\ncreatedAt: \"2024-01-01T00:00:00Z\"\nupdatedAt: \"2024-01-01T00:00:00Z\"\nfields:\n  title: \"Unknown\"\n---`)
    );
    const result = validateDatasetSnapshot(snapshot);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((error) => error.code === "E_UNKNOWN_RECORD_DIR")).toBe(true);
    }
  });

  it("flags record type mismatches", () => {
    const snapshot = validSnapshot();
    snapshot.files.set(
      "records/note/record--1.md",
      encoder.encode(`---\nid: \"note:1\"\ndatasetId: \"dataset:demo\"\ntypeId: \"task\"\ncreatedAt: \"2024-01-01T00:00:00Z\"\nupdatedAt: \"2024-01-01T00:00:00Z\"\nfields:\n  title: \"Hello\"\n---`)
    );
    const result = validateDatasetSnapshot(snapshot);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((error) => error.code === "E_TYPEID_MISMATCH")).toBe(true);
    }
  });

  it("flags duplicate ids", () => {
    const snapshot = validSnapshot();
    snapshot.files.set(
      "records/note/record--2.md",
      encoder.encode(`---\nid: \"note:1\"\ndatasetId: \"dataset:demo\"\ntypeId: \"note\"\ncreatedAt: \"2024-01-01T00:00:00Z\"\nupdatedAt: \"2024-01-01T00:00:00Z\"\nfields:\n  title: \"Duplicate\"\n---`)
    );
    const result = validateDatasetSnapshot(snapshot);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((error) => error.code === "E_DUPLICATE_ID")).toBe(true);
    }
  });
});
