import { describe, expect, it } from "vitest";

import { isPluginManifestCandidateBytes } from "../pluginManifest";
import { loadFixtureSnapshot } from "../../__tests__/fixtureLoader";

const encoder = new TextEncoder();

describe("plugin manifest discovery", () => {
  it("PLUG-LAYOUT-001: discovers plugin manifests in fixtures", () => {
    const snapshot = loadFixtureSnapshot("plugin-valid-dataset");
    const bytes = snapshot.files.get("plugins/demo/manifest.md");
    expect(bytes).toBeDefined();
    expect(isPluginManifestCandidateBytes("plugins/demo/manifest.md", bytes!)).toBe(true);
  });

  it("PLUG-LAYOUT-001: detects plugin manifests with CR-only line endings", () => {
    const text = ["---", "pluginId: demo", "gdApiVersion: 1", "---", "body"].join("\r");
    const bytes = encoder.encode(text);
    expect(isPluginManifestCandidateBytes("plugins/demo/manifest.md", bytes)).toBe(true);
  });

  it("PLUG-LAYOUT-001: record precedence keeps type records from being plugin manifests", () => {
    const text = ["---", "typeId: note", "pluginId: demo", "gdApiVersion: 1", "---", "body"].join("\n");
    const bytes = encoder.encode(text);
    expect(isPluginManifestCandidateBytes("records/note.md", bytes)).toBe(false);
  });

  it("PLUG-LAYOUT-001: requires pluginId and gdApiVersion keys", () => {
    const onlyPluginId = ["---", "pluginId: demo", "---", "body"].join("\n");
    const onlyApiVersion = ["---", "gdApiVersion: 1", "---", "body"].join("\n");
    expect(isPluginManifestCandidateBytes("plugins/demo/manifest.md", encoder.encode(onlyPluginId))).toBe(false);
    expect(isPluginManifestCandidateBytes("plugins/demo/manifest.md", encoder.encode(onlyApiVersion))).toBe(false);
  });
});
