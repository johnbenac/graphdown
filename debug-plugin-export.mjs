import {
  blockPathForCid,
  canonicalizeDatasetSnapshot,
  cidFromRawBytes
} from "@graphdown/core";

const enc = new TextEncoder();
const toBytes = (text) => enc.encode(text);

function snapshotFromEntries(entries) {
  return {
    files: new Map(
      entries.map(([path, contents]) => [
        path,
        contents instanceof Uint8Array ? contents : toBytes(contents)
      ])
    )
  };
}

const manifest = [
  "---",
  "pluginId: demo",
  "gdApiVersion: 1",
  "entry: entry.js",
  "files:",
  "  - entry.js",
  "  - ui.md",
  "---",
  "",
  "Plugin manifest."
].join("\n");

const snapshot = snapshotFromEntries([
  ["weird/type-location.md", ["---", "typeId: note", "fields: {}", "---"].join("\n")],
  [
    "deep/nested/record.md",
    ["---", "typeId: note", "recordId: one", "fields: {}", "---", "Body"].join("\n")
  ],
  ["plugins/demo/manifest.md", manifest],
  ["plugins/demo/entry.js", toBytes("console.log('entry');")],
  ["plugins/demo/ui.md", toBytes("# UI")]
]);

console.log("Input snapshot files:");
for (const [path, bytes] of snapshot.files) {
  console.log(`  ${path} (${bytes.length} bytes)`);
}

console.log("\nCanonicalizing...");
const canonical = canonicalizeDatasetSnapshot(snapshot);

console.log("\nOutput canonical files:");
for (const [path, bytes] of canonical.files) {
  console.log(`  ${path} (${bytes.length} bytes)`);
}

console.log("\nLooking for plugin files:");
console.log("  plugins/demo/manifest.md:", canonical.files.has("plugins/demo/manifest.md") ? "FOUND" : "MISSING");
console.log("  plugins/demo/entry.js:", canonical.files.has("plugins/demo/entry.js") ? "FOUND" : "MISSING");
console.log("  plugins/demo/ui.md:", canonical.files.has("plugins/demo/ui.md") ? "FOUND" : "MISSING");
