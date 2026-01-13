import assert from "node:assert/strict";
import { test } from "vitest";

import { isPluginManifestCandidateBytes } from "..";
import { loadFixtureSnapshot } from "./fixtureLoader";

const encoder = new TextEncoder();

test("PLUG-LAYOUT-001: detects plugin manifest fixtures", () => {
  const snapshot = loadFixtureSnapshot("plugin-valid-dataset");
  const bytes = snapshot.files.get("extensions/demo/plugin.md");
  assert.ok(bytes, "expected fixture plugin manifest bytes");
  assert.equal(isPluginManifestCandidateBytes("extensions/demo/plugin.md", bytes), true);
});

test("PLUG-LAYOUT-001: record precedence rejects records with typeId", () => {
  const text = [
    "---",
    "typeId: note",
    "pluginId: demo",
    "gdApiVersion: 1",
    "fields: {}",
    "---",
    "body",
  ].join("\n");
  const bytes = encoder.encode(text);
  assert.equal(isPluginManifestCandidateBytes("records/note.md", bytes), false);
});

test("PLUG-LAYOUT-001: requires pluginId and gdApiVersion keys", () => {
  const onlyPluginId = ["---", "pluginId: demo", "---", "body"].join("\n");
  const onlyApiVersion = ["---", "gdApiVersion: 1", "---", "body"].join("\n");

  assert.equal(isPluginManifestCandidateBytes("plugin.md", encoder.encode(onlyPluginId)), false);
  assert.equal(isPluginManifestCandidateBytes("plugin.md", encoder.encode(onlyApiVersion)), false);
});
