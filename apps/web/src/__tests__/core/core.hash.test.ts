import { describe, expect, it } from "vitest";
import { computeGdHashV1 } from "../../core/hash";

const encoder = new TextEncoder();

function snapshot(entries: Array<[string, string | Uint8Array]>) {
  return {
    files: new Map(
      entries.map(([path, content]) => [path, content instanceof Uint8Array ? content : encoder.encode(content)])
    )
  };
}

function typeFile(path: string, typeId: string): [string, string] {
  return [path, ["---", `typeId: ${typeId}`, "fields: {}", "---", ""].join("\n")];
}

function recordFile(path: string, typeId: string, recordId: string, body = ""): [string, string] {
  return [path, ["---", `typeId: ${typeId}`, `recordId: ${recordId}`, "fields: {}", "---", body].join("\n")];
}

function digest(result: ReturnType<typeof computeGdHashV1>) {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(result.errors.map((error) => error.message).join("\n"));
  }
  return result.digest;
}

describe("hash", () => {
  it("HASH-003: snapshot hash is path-independent for record files", () => {
    const type = typeFile("types/note.md", "note");
    const recordContent = recordFile("records/note/one.md", "note", "one", "Body");

    const snapshotA = snapshot([type, recordContent]);
    const snapshotB = snapshot([type, ["some/other/path.md", recordContent[1]]]);

    const digestA = digest(computeGdHashV1(snapshotA, "snapshot"));
    const digestB = digest(computeGdHashV1(snapshotB, "snapshot"));

    expect(digestA).toBe(digestB);
  });

  it("HASH-002: schema fingerprint ignores record object changes", () => {
    const type = typeFile("type.md", "note");
    const record = recordFile("r.md", "note", "one", "Body");
    const base = snapshot([type, record]);

    const schemaDigest = digest(computeGdHashV1(base, "schema"));
    const snapshotDigest = digest(computeGdHashV1(base, "snapshot"));

    const schemaChanged = snapshot([[type[0], type[1].replace("fields: {}", "fields:\n  extra: true")], record]);
    const schemaChangedDigest = digest(computeGdHashV1(schemaChanged, "schema"));
    expect(schemaChangedDigest).not.toBe(schemaDigest);

    const recordChanged = snapshot([type, recordFile("r.md", "note", "one", "Updated")]);
    const snapshotChanged = digest(computeGdHashV1(recordChanged, "snapshot"));
    expect(snapshotChanged).not.toBe(snapshotDigest);
    expect(digest(computeGdHashV1(recordChanged, "schema"))).toBe(schemaDigest);
  });

  it("HASH-004: invalid hash scope fails with E_USAGE", () => {
    const type = typeFile("type.md", "note");
    const result = computeGdHashV1(snapshot([type]), "records");
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.errors.some((error) => error.code === "E_USAGE")).toBe(true);
  });

  it("HASH-005: snapshot hash ignores blob store bytes", () => {
    const type = typeFile("type.md", "note");
    const record = recordFile("r.md", "note", "one", "Body");
    const blobDigest = "a".repeat(64);
    const blobPath = `blobs/sha256/${blobDigest.slice(0, 2)}/${blobDigest}`;
    const base = snapshot([type, record, [blobPath, encoder.encode("one")]]);
    const changedBlob = snapshot([type, record, [blobPath, encoder.encode("two")]]);

    const baseDigest = digest(computeGdHashV1(base, "snapshot"));
    const changedDigest = digest(computeGdHashV1(changedBlob, "snapshot"));
    expect(baseDigest).toBe(changedDigest);
  });

  it("HASH-001: line ending normalization yields stable hashes", () => {
    const unix = typeFile("t.md", "note");
    const windows: [string, string] = ["t.md", unix[1].replace(/\n/g, "\r\n")];
    const digestUnix = digest(computeGdHashV1(snapshot([unix]), "schema"));
    const digestWindows = digest(computeGdHashV1(snapshot([windows]), "schema"));
    expect(digestUnix).toBe(digestWindows);
  });

  it("HASH-001: non-record files are ignored", () => {
    const type = typeFile("type.md", "note");
    const base = digest(computeGdHashV1(snapshot([type]), "schema"));
    const withReadme = digest(computeGdHashV1(snapshot([type, ["README.md", "# docs\n"]]), "schema"));
    expect(base).toBe(withReadme);
  });

  it("HASH-001: duplicate identities fail hashing", () => {
    const typeA = typeFile("a.md", "note");
    const typeB = typeFile("b.md", "note");
    const result = computeGdHashV1(snapshot([typeA, typeB]), "schema");
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.errors.some((error) => error.code === "E_DUPLICATE_ID")).toBe(true);
  });
});
