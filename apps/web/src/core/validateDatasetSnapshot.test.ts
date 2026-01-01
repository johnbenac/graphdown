import { describe, expect, it } from "vitest";
import { validateDatasetSnapshot } from "../../../../src/core/validateDatasetSnapshot";
import type { RepoSnapshot } from "../../../../src/core/snapshotTypes";

const encoder = new TextEncoder();

function snapshotFromEntries(entries: Array<[string, string]>): RepoSnapshot {
  return {
    files: new Map(entries.map(([path, content]) => [path, encoder.encode(content)]))
  };
}

function baseSnapshot(): RepoSnapshot {
  return snapshotFromEntries([
    [
      "datasets/demo.md",
      [
        "---",
        "id: dataset:demo",
        "datasetId: dataset:demo",
        "typeId: sys:dataset",
        "createdAt: 2024-01-01",
        "updatedAt: 2024-01-02",
        "fields:",
        "  name: Demo",
        "  description: Demo dataset",
        "---",
        "Dataset body"
      ].join("\n")
    ],
    [
      "types/note.md",
      [
        "---",
        "id: type:note",
        "datasetId: dataset:demo",
        "typeId: sys:type",
        "createdAt: 2024-01-01",
        "updatedAt: 2024-01-02",
        "fields:",
        "  recordTypeId: note",
        "---",
        "Type body"
      ].join("\n")
    ],
    [
      "records/note/record-1.md",
      [
        "---",
        "id: record:1",
        "datasetId: dataset:demo",
        "typeId: note",
        "createdAt: 2024-01-01",
        "updatedAt: 2024-01-02",
        "fields:",
        "  title: First",
        "---",
        "Record body"
      ].join("\n")
    ]
  ]);
}

function snapshotWithRequiredFieldDefs(recordFields: string): RepoSnapshot {
  return snapshotFromEntries([
    [
      "datasets/demo.md",
      [
        "---",
        "id: dataset:demo",
        "datasetId: dataset:demo",
        "typeId: sys:dataset",
        "createdAt: 2024-01-01",
        "updatedAt: 2024-01-02",
        "fields:",
        "  name: Demo",
        "  description: Demo dataset",
        "---",
        "Dataset body"
      ].join("\n")
    ],
    [
      "types/note.md",
      [
        "---",
        "id: type:note",
        "datasetId: dataset:demo",
        "typeId: sys:type",
        "createdAt: 2024-01-01",
        "updatedAt: 2024-01-02",
        "fields:",
        "  recordTypeId: note",
        "  fieldDefs:",
        "    title:",
        "      kind: string",
        "      required: true",
        "---",
        "Type body"
      ].join("\n")
    ],
    [
      "records/note/record-1.md",
      [
        "---",
        "id: record:1",
        "datasetId: dataset:demo",
        "typeId: note",
        "createdAt: 2024-01-01",
        "updatedAt: 2024-01-02",
        recordFields,
        "---",
        "Record body"
      ].join("\n")
    ]
  ]);
}

function getErrorCodes(snapshot: RepoSnapshot) {
  const result = validateDatasetSnapshot(snapshot);
  if (result.ok) {
    return [];
  }
  return result.errors.map((error) => error.code);
}

describe("validateDatasetSnapshot", () => {
  it("LAYOUT-001: missing required directories fails validation", () => {
    const snapshot = snapshotFromEntries([]);
    expect(getErrorCodes(snapshot)).toContain("E_DIR_MISSING");
  });

  it("LAYOUT-003: multiple dataset manifests in datasets/ fails validation", () => {
    const snapshot = snapshotFromEntries([
      ["datasets/one.md", "---\nid: dataset:one\n---"],
      ["datasets/two.md", "---\nid: dataset:two\n---"],
      ["types/.keep", "placeholder"],
      ["records/.keep", "placeholder"]
    ]);
    expect(getErrorCodes(snapshot)).toContain("E_DATASET_FILE_COUNT");
  });

  it("LAYOUT-003: nested dataset manifests under datasets/** are rejected", () => {
    const snapshot = snapshotFromEntries([
      ["datasets/one.md", "---\nid: dataset:one\n---"],
      ["datasets/archive/two.md", "---\nid: dataset:two\n---"],
      ["types/.keep", "placeholder"],
      ["records/.keep", "placeholder"]
    ]);
    const codes = getErrorCodes(snapshot);
    expect(codes).toContain("E_DATASET_SUBDIR_UNSUPPORTED");
    expect(codes).toContain("E_DATASET_FILE_COUNT");
  });

  it("FR-MD-020: missing YAML front matter fails validation", () => {
    const snapshot = snapshotFromEntries([
      ["datasets/demo.md", "No front matter"],
      ["types/placeholder.md", "---\nid: type:placeholder\nfields: {}\n---"],
      ["records/placeholder/record.md", "---\nid: record:placeholder\nfields: {}\n---"]
    ]);
    expect(getErrorCodes(snapshot)).toContain("E_FRONT_MATTER_MISSING");
  });

  it("FR-MD-020: invalid YAML fails validation", () => {
    const snapshot = snapshotFromEntries([
      ["datasets/demo.md", "---\nfoo: [\n---"],
      ["types/placeholder.md", "---\nid: type:placeholder\nfields: {}\n---"],
      ["records/placeholder/record.md", "---\nid: record:placeholder\nfields: {}\n---"]
    ]);
    expect(getErrorCodes(snapshot)).toContain("E_YAML_INVALID");
  });

  it("FR-MD-021: missing required id field fails validation", () => {
    const snapshot = snapshotFromEntries([
      [
        "datasets/demo.md",
        [
          "---",
          "datasetId: dataset:demo",
          "typeId: sys:dataset",
          "createdAt: 2024-01-01",
          "updatedAt: 2024-01-02",
          "fields: {}",
          "---"
        ].join("\n")
      ],
      ["types/placeholder.md", "---\nid: type:placeholder\nfields: { recordTypeId: placeholder }\n---"],
      ["records/placeholder/record.md", "---\nid: record:placeholder\nfields: {}\n---"]
    ]);
    expect(getErrorCodes(snapshot)).toContain("E_REQUIRED_FIELD_MISSING");
  });

  it("LAYOUT-002: ignores non-markdown files under records/", () => {
    const snapshot = baseSnapshot();
    snapshot.files.set("records/.gitkeep", encoder.encode("keep"));
    const result = validateDatasetSnapshot(snapshot);
    expect(result.ok).toBe(true);
  });

  it("LAYOUT-005: markdown files must live under records/<recordTypeId>/", () => {
    const snapshot = baseSnapshot();
    snapshot.files.set("records/README.md", encoder.encode("docs"));
    expect(getErrorCodes(snapshot)).toContain("E_UNKNOWN_RECORD_DIR");
  });

  it("LAYOUT-005: record files directly under records/ are invalid", () => {
    const snapshot = baseSnapshot();
    snapshot.files.set(
      "records/record-1.md",
      encoder.encode("---\nid: record:bad\n---")
    );
    expect(getErrorCodes(snapshot)).toContain("E_UNKNOWN_RECORD_DIR");
  });

  it("LAYOUT-002: ignores non-markdown files placed under records/", () => {
    const snapshot = baseSnapshot();
    snapshot.files.set("records/.gitignore", encoder.encode("*\n"));
    snapshot.files.set("records/notes.txt", encoder.encode("hello"));
    const result = validateDatasetSnapshot(snapshot);
    expect(result.ok).toBe(true);
  });

  it("VAL-001: unknown record type directories fail validation", () => {
    const snapshot = snapshotFromEntries([
      [
        "datasets/demo.md",
        [
          "---",
          "id: dataset:demo",
          "datasetId: dataset:demo",
          "typeId: sys:dataset",
          "createdAt: 2024-01-01",
          "updatedAt: 2024-01-02",
          "fields:",
          "  name: Demo",
          "  description: Demo dataset",
          "---"
        ].join("\n")
      ],
      [
        "types/note.md",
        [
          "---",
          "id: type:note",
          "datasetId: dataset:demo",
          "typeId: sys:type",
          "createdAt: 2024-01-01",
          "updatedAt: 2024-01-02",
          "fields:",
          "  recordTypeId: note",
          "---"
        ].join("\n")
      ],
      [
        "records/unknown/record.md",
        [
          "---",
          "id: record:1",
          "datasetId: dataset:demo",
          "typeId: unknown",
          "createdAt: 2024-01-01",
          "updatedAt: 2024-01-02",
          "fields: {}",
          "---"
        ].join("\n")
      ]
    ]);
    expect(getErrorCodes(snapshot)).toContain("E_UNKNOWN_RECORD_DIR");
  });

  it("FR-MD-021: missing datasetId fails validation", () => {
    const snapshot = baseSnapshot();
    const dataset = snapshot.files.get("datasets/demo.md");
    if (dataset) {
      const text = new TextDecoder().decode(dataset);
      const replaced = text.replace("datasetId: dataset:demo\n", "");
      snapshot.files.set("datasets/demo.md", encoder.encode(replaced));
    }
    expect(getErrorCodes(snapshot)).toContain("E_REQUIRED_FIELD_MISSING");
  });

  it("VAL-004: record typeId must match records/<recordTypeId>/ directory", () => {
    const snapshot = baseSnapshot();
    const record = snapshot.files.get("records/note/record-1.md");
    if (record) {
      const text = new TextDecoder().decode(record);
      const replaced = text.replace("typeId: note", "typeId: other");
      snapshot.files.set("records/note/record-1.md", encoder.encode(replaced));
    }
    expect(getErrorCodes(snapshot)).toContain("E_TYPEID_MISMATCH");
  });

  it("VAL-003: datasetId must be consistent across dataset and type files", () => {
    const snapshot = baseSnapshot();
    const typeFile = snapshot.files.get("types/note.md");
    if (typeFile) {
      const text = new TextDecoder().decode(typeFile);
      const replaced = text.replace("datasetId: dataset:demo", "datasetId: dataset:other");
      snapshot.files.set("types/note.md", encoder.encode(replaced));
    }
    expect(getErrorCodes(snapshot)).toContain("E_DATASET_ID_MISMATCH");
  });

  it("VAL-002: ids must be globally unique", () => {
    const snapshot = baseSnapshot();
    const record = snapshot.files.get("records/note/record-1.md");
    if (record) {
      const text = new TextDecoder().decode(record);
      const replaced = text.replace("id: record:1", "id: dataset:demo");
      snapshot.files.set("records/note/record-1.md", encoder.encode(replaced));
    }
    expect(getErrorCodes(snapshot)).toContain("E_DUPLICATE_ID");
  });

  it("VAL-005: missing required fields fails validation", () => {
    const snapshot = snapshotWithRequiredFieldDefs("fields: {}");
    expect(getErrorCodes(snapshot)).toContain("E_REQUIRED_FIELD_MISSING");
  });

  it("VAL-005: null required field fails validation", () => {
    const snapshot = snapshotWithRequiredFieldDefs(
      ["fields:", "  title: null"].join("\n")
    );
    expect(getErrorCodes(snapshot)).toContain("E_REQUIRED_FIELD_MISSING");
  });

  it("VAL-005: present required field passes validation", () => {
    const snapshot = snapshotWithRequiredFieldDefs(
      ["fields:", "  title: Present"].join("\n")
    );
    const result = validateDatasetSnapshot(snapshot);
    expect(result.ok).toBe(true);
  });
});
