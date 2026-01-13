import { describe, expect, it } from "vitest";

import { isPluginManifestCandidateBytes } from "../parse/pluginManifest";
import { loadFixtureSnapshot } from "./fixtureLoader";

const encoder = new TextEncoder();

describe("pluginManifest discovery", () => {
  it("PLUG-LAYOUT-001: detects plugin manifest candidates from fixtures", () => {
    const snapshot = loadFixtureSnapshot("plugin-valid-dataset");
    const bytes = snapshot.files.get("extensions/demo/plugin.md");
    expect(bytes).toBeDefined();
    expect(isPluginManifestCandidateBytes("extensions/demo/plugin.md", bytes!)).toBe(true);
  });

  it("PLUG-LAYOUT-001: record files take precedence over plugin manifest keys", () => {
    const text = `---\ntypeId: note\npluginId: demo\ngdApiVersion: 1\n---\nBody`;
    const bytes = encoder.encode(text);
    expect(isPluginManifestCandidateBytes("records/note.md", bytes)).toBe(false);
  });

  it("PLUG-LAYOUT-001: requires both pluginId and gdApiVersion keys", () => {
    const onlyPluginId = `---\npluginId: demo\n---\nBody`;
    const onlyApiVersion = `---\ngdApiVersion: 1\n---\nBody`;

    expect(isPluginManifestCandidateBytes("extensions/demo/plugin.md", encoder.encode(onlyPluginId))).toBe(false);
    expect(isPluginManifestCandidateBytes("extensions/demo/plugin.md", encoder.encode(onlyApiVersion))).toBe(false);
  });
});
