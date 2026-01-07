import { createHash } from "node:crypto";
import { strToU8, unzipSync, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { canonicalizeDatasetSnapshot } from "../core/canonicalizeDatasetSnapshot";
import type { DatasetSnapshot } from "../core/snapshotTypes";
import { exportDatasetZipBytes } from "../core/export";
import { loadDatasetSnapshotFromZipBytes } from "../core/zipSnapshot";
import { readZipSnapshot } from "../import/readZipSnapshot";

function snapshotFromEntries(entries: Array<[string, string | Uint8Array]>): DatasetSnapshot {
  return {
    files: new Map(
      entries.map(([path, contents]) => [
        path,
        contents instanceof Uint8Array ? contents : new Uint8Array(strToU8(contents))
      ])
    )
  };
}

function exportAndLoad(rawSnapshot: DatasetSnapshot) {
  const canonical = canonicalizeDatasetSnapshot(rawSnapshot);
  const zipBytes = exportDatasetZipBytes(canonical);
  return loadDatasetSnapshotFromZipBytes(zipBytes);
}

describe("exportDatasetZipBytes", () => {
  it("EXP-HIER-001: export uses canonical layout paths", () => {
    const snapshot = snapshotFromEntries([
      ["weird/type-location.md", ["---", "typeId: note", "fields: {}", "---"].join("\n")],
      ["deep/nested/record.md", ["---", "typeId: note", "recordId: one", "fields: {}", "---"].join("\n")],
      ["docs/readme.md", "# ignore"],
      ["assets/logo.png", "binary"]
    ]);

    const imported = exportAndLoad(snapshot);
    const paths = [...imported.files.keys()].sort();
    expect(paths).toEqual(["records/note.one/one.md", "types/note.md"]);
  });

  it("GC-001: reachable blob set includes references from fields", () => {
    const blobBytes = new Uint8Array(strToU8("orchid"));
    const digest = createHash("sha256").update(Buffer.from(blobBytes)).digest("hex");
    const blobPath = `blobs/sha256/${digest.slice(0, 2)}/${digest}`;

    const snapshot = snapshotFromEntries([
      ["types/photo.md", ["---", "typeId: photo", "fields: {}", "---"].join("\n")],
      [
        "records/photo-1.md",
        ["---", "typeId: photo", "recordId: one", "fields:", `  ref: "[[gdblob:sha256-${digest}]]"`, "---", "Body"].join("\n")
      ],
      [blobPath, blobBytes]
    ]);

    const imported = exportAndLoad(snapshot);
    expect(imported.files.has(blobPath)).toBe(true);
  });

  it("EXP-002: record-only export excludes non-graph files", () => {
    const snapshot = snapshotFromEntries([
      ["types/note.md", ["---", "typeId: note", "fields: {}", "---"].join("\n")],
      ["records/note/custom.md", ["---", "typeId: note", "recordId: one", "fields: {}", "---"].join("\n")],
      ["docs/readme.md", "ignore me"],
      ["assets/logo.png", "binary"]
    ]);

    const imported = exportAndLoad(snapshot);
    expect([...imported.files.keys()].sort()).toEqual(["records/note.one/one.md", "types/note.md"]);
  });

  it("EXP-004: export canonicalizes record/type file paths", () => {
    const snapshot = snapshotFromEntries([
      ["custom/path/type.md", ["---", "typeId: note", "fields: {}", "---"].join("\n")],
      ["another/deep/record.md", ["---", "typeId: note", "recordId: one", "fields: {}", "---"].join("\n")]
    ]);

    const imported = exportAndLoad(snapshot);
    expect(imported.files.has("types/note.md")).toBe(true);
    expect(imported.files.has("records/note.one/one.md")).toBe(true);
    expect(imported.files.has("custom/path/type.md")).toBe(false);
    expect(imported.files.has("another/deep/record.md")).toBe(false);
  });

  it("EXP-005: export preserves bytes exactly", () => {
    const original = new Uint8Array(
      strToU8(["---", "typeId: note", "recordId: one", "fields: {}", "---", "Body with \r\ntrailing  ", "Emoji: 😊"].join("\n"))
    );
    const snapshot = snapshotFromEntries([
      ["types/note.md", ["---", "typeId: note", "fields: {}", "---"].join("\n")],
      ["records/note/custom.md", original]
    ]);

    const imported = exportAndLoad(snapshot);
    const roundTrip = imported.files.get("records/note.one/one.md");
    expect(roundTrip).toBeDefined();
    expect(roundTrip).toEqual(original);
  });

  it("EXP-006: includes only referenced blobs alongside canonical records/types", () => {
    const blobBytes = new Uint8Array(strToU8("flower"));
    const digest = createHash("sha256").update(Buffer.from(blobBytes)).digest("hex");
    const blobPath = `blobs/sha256/${digest.slice(0, 2)}/${digest}`;

    const snapshot = snapshotFromEntries([
      ["types/photo.md", ["---", "typeId: photo", "fields: {}", "---"].join("\n")],
      [
        "records/photo-1.md",
        ["---", "typeId: photo", "recordId: one", "fields: {}", "---", `See [[gdblob:sha256-${digest}]].`].join("\n")
      ],
      [blobPath, blobBytes],
      ["blobs/sha256/aa/" + "a".repeat(64), new Uint8Array(strToU8("garbage"))]
    ]);

    const imported = exportAndLoad(snapshot);
    const paths = [...imported.files.keys()].sort();
    expect(paths).toEqual(["records/photo.one/one.md", "types/photo.md", blobPath].sort());
  });

  it("UI-PLUGIN-001: export includes canonical plugin artifacts + graphdown.ui.json with byte preservation", async () => {
    const pluginManifestBytes = new Uint8Array(
      strToU8(
        JSON.stringify({
          id: "boolean-01",
          version: "1.0.0",
          entry: "plugin.js",
          providers: [{ id: "default", capability: "field.view", match: { kind: "boolean" } }]
        })
      )
    );
    const pluginJsBytes = new Uint8Array(
      strToU8(
        [
          "export default {",
          "  default({ container }) {",
          "    container.textContent = 'ok';",
          "  }",
          "};"
        ].join("\n")
      )
    );
    const configBytes = new Uint8Array(
      strToU8(
        JSON.stringify({
          resolutions: [{ capability: "field.view", match: { kind: "boolean" }, use: "boolean-01" }]
        })
      )
    );
    const recordBytes = new Uint8Array(
      strToU8(["---", "typeId: flag", "recordId: demo", "fields: {}", "---", "Body"].join("\n"))
    );
    const typeBytes = new Uint8Array(strToU8(["---", "typeId: flag", "fields: {}", "---"].join("\n")));

    const zipBytes = zipSync({
      "types/flag.md": typeBytes,
      "records/flag/demo.md": recordBytes,
      "ui/renderers/boolean-01/plugin.json": pluginManifestBytes,
      "ui/renderers/boolean-01/plugin.js": pluginJsBytes,
      "ui/config/graphdown.ui.json": configBytes
    });

    const file = {
      arrayBuffer: async () => Uint8Array.from(zipBytes).buffer
    } as File;

    const { snapshot: rawSnapshot } = await readZipSnapshot(file);
    const canonicalSnapshot = canonicalizeDatasetSnapshot(rawSnapshot);
    const exportedZipBytes = exportDatasetZipBytes(canonicalSnapshot);
    const exportedEntries = unzipSync(exportedZipBytes);
    const exportedPaths = Object.keys(exportedEntries)
      .filter((path) => !path.endsWith("/"))
      .sort();

    expect(exportedPaths).toContain("plugins/boolean-01/plugin.json");
    expect(exportedPaths).toContain("plugins/boolean-01/plugin.js");
    expect(exportedPaths).toContain("graphdown.ui.json");
    expect(exportedPaths).toContain("types/flag.md");
    expect(exportedPaths).toContain("records/flag.demo/demo.md");

    expect(exportedPaths).not.toContain("ui/renderers/boolean-01/plugin.json");
    expect(exportedPaths).not.toContain("ui/config/graphdown.ui.json");
    expect(exportedPaths).not.toContain("records/flag/demo.md");

    expect(exportedEntries["plugins/boolean-01/plugin.json"]).toEqual(pluginManifestBytes);
    expect(exportedEntries["plugins/boolean-01/plugin.js"]).toEqual(pluginJsBytes);
    expect(exportedEntries["graphdown.ui.json"]).toEqual(configBytes);
  });
});
