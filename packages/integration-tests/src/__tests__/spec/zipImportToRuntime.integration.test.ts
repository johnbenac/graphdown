import { describe, expect, it } from "vitest";

import { buildDatasetZipBytes, loadDatasetSnapshotFromZipBytes } from "@graphmd/io-zip";
import { selectSemanticSnapshotFiles } from "@graphmd/io";
import { validateDatasetSnapshot } from "@graphmd/dataset";
import { openRuntimeApiV1 } from "@graphmd/runtime";

const encoder = new TextEncoder();

function u8(text: string): Uint8Array {
  return encoder.encode(text);
}

describe("integration: io-zip -> selection -> dataset validation -> runtime open", () => {
  it("imports a zip (with plugin bundles + binary + blocks), selects semantic files, validates, and opens runtime", async () => {
    // Well-known CID for an empty sha2-256 block (used in repo fixtures too).
    const EMPTY_BLOCK_CID =
      "bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku";
    const EMPTY_BLOCK_PATH = `blocks/sha2-256/e3/${EMPTY_BLOCK_CID}`;

    // Minimal valid dataset: 1 type + 1 record
    const typeNoteMd = ["---", "typeId: note", "fields: {}", "---", "# Note Type", ""].join("\n");

    const recordOneMd = [
      "---",
      "typeId: note",
      "recordId: one",
      "fields:",
      '  title: "One"',
      "---",
      "",
      "# One",
      ""
    ].join("\n");

    // Plugin manifest that *requires* bundle files (including non-md) and a block:
    // - ui.md (plain markdown, not a record file)
    // - entry.js (non-md text)
    // - logo.png (binary)
    // - blocks includes EMPTY_BLOCK_CID
    const pluginManifestMd = [
      "---",
      "pluginId: demo",
      "gdApiVersion: 1",
      "entry: entry.js",
      "files:",
      "  - entry.js",
      "  - ui.md",
      "  - logo.png",
      "binaryFiles:",
      "  - logo.png",
      "blocks:",
      `  - ${EMPTY_BLOCK_CID}`,
      "---",
      "",
      "Demo plugin manifest for zip integration test.",
      ""
    ].join("\n");

    const pluginUiMd = ["# Demo UI", "", "Hello from ui.md", ""].join("\n");
    const pluginEntryJs = ["export function activate() {", "  return { ok: true };", "}", ""].join(
      "\n"
    );
    const pluginLogoPngBytes = new Uint8Array([0, 1, 2, 3]);

    // Noise files that must be ignored by semantic selection
    const docsReadmeMd = ["# readme", "", "not a graphmd record", ""].join("\n");
    const assetsLogoPngBytes = new Uint8Array([9, 9, 9]);

    // Build a "raw snapshot" that simulates an on-disk repo before selection.
    const originalSnapshot = {
      files: new Map<string, Uint8Array>([
        ["types/note.md", u8(typeNoteMd)],
        ["records/note/one.md", u8(recordOneMd)],

        ["plugins/demo/manifest.md", u8(pluginManifestMd)],
        ["plugins/demo/ui.md", u8(pluginUiMd)],
        ["plugins/demo/entry.js", u8(pluginEntryJs)],
        ["plugins/demo/logo.png", pluginLogoPngBytes],

        [EMPTY_BLOCK_PATH, new Uint8Array()], // zero-byte block must survive zip

        ["docs/readme.md", u8(docsReadmeMd)],
        ["assets/logo.png", assetsLogoPngBytes]
      ])
    };

    // 1) Zip roundtrip: snapshot -> zip bytes -> extracted snapshot
    const zipBytes = buildDatasetZipBytes(originalSnapshot);
    const extractedSnapshot = loadDatasetSnapshotFromZipBytes(zipBytes);

    // Assert: zip preserved every file byte-for-byte (including binary + zero-byte)
    expect(extractedSnapshot.files.size).toBe(originalSnapshot.files.size);
    for (const [path, bytes] of originalSnapshot.files.entries()) {
      const got = extractedSnapshot.files.get(path);
      expect(got).toBeInstanceOf(Uint8Array);
      expect(got).toEqual(bytes);
    }

    // 2) Semantic selection: keep blocks + record/type files + required plugin bundles
    const selection = selectSemanticSnapshotFiles(extractedSnapshot.files);

    expect(selection.missingPluginBundlePaths).toEqual([]);
    expect(selection.pluginManifestPaths).toEqual(["plugins/demo/manifest.md"]);

    // Required bundle paths (resolved relative to manifest dir)
    expect(selection.requiredPluginBundlePaths).toEqual(
      ["plugins/demo/entry.js", "plugins/demo/logo.png", "plugins/demo/ui.md"].sort(
        (a, b) => a.localeCompare(b)
      )
    );

    // Ignored should be exactly the noise files
    expect(selection.ignored).toEqual(["assets/logo.png", "docs/readme.md"]);

    // Selected snapshot should contain only semantic files + required bundles
    const selectedPaths = [...selection.snapshot.files.keys()].sort((a, b) => a.localeCompare(b));
    expect(selectedPaths).toEqual(
      [
        EMPTY_BLOCK_PATH,
        "plugins/demo/entry.js",
        "plugins/demo/logo.png",
        "plugins/demo/manifest.md",
        "plugins/demo/ui.md",
        "records/note/one.md",
        "types/note.md"
      ].sort((a, b) => a.localeCompare(b))
    );

    // 3) Dataset validation must pass on the selected snapshot
    const validation = validateDatasetSnapshot(selection.snapshot);
    expect(validation.ok).toBe(true);

    // 4) Runtime must open and behave correctly
    const runtimeResult = await openRuntimeApiV1({ snapshot: selection.snapshot });
    expect(runtimeResult.ok).toBe(true);

    if (!runtimeResult.ok) return;
    const api = runtimeResult.value;

    expect(await api.listTypeIds()).toEqual(["note"]);
    expect(await api.listRecordKeysByType("note")).toEqual(["note:one"]);

    const rec = await api.getRecord("note:one");
    expect(rec).not.toBeNull();
    expect(rec?.fields).toEqual({ title: "One" });
    expect(rec?.body).toMatch(/# One/);

    // Plugin manifest declares the empty block CID as reachable
    const reachable = await api.listReachableBlockCids();
    expect(reachable).toContain(EMPTY_BLOCK_CID);

    expect(await api.hasBlock(EMPTY_BLOCK_CID)).toBe(true);
    const blockBytes = await api.getBlockBytes(EMPTY_BLOCK_CID);
    expect(blockBytes).not.toBeNull();
    if (!blockBytes) {
      throw new Error("Expected empty block bytes to be present.");
    }
    expect(blockBytes).toBeInstanceOf(Uint8Array);
    expect(blockBytes.length).toBe(0);
  });
});
