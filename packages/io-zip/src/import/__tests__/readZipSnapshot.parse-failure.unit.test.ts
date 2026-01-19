import { describe, expect, it, vi } from "vitest";
import { strToU8, zipSync } from "fflate";
import { isImportError } from "@graphdown/io";

vi.mock("@graphdown/core", async () => {
  const actual = await vi.importActual<typeof import("@graphdown/core")>("@graphdown/core");
  return {
    ...actual,
    isPluginManifestCandidateBytes: vi.fn(() => true),
    parsePluginManifest: vi.fn(() => ({
      ok: false,
      error: { code: "E_YAML_INVALID", message: "bad yaml" }
    }))
  };
});

const { readZipSnapshotFromBytes } = await import("../readZipSnapshotFromBytes");

const bytes = (text: string) => new Uint8Array(strToU8(text));

describe("readZipSnapshotFromBytes plugin parse failures", () => {
  it("throws when a plugin manifest cannot be parsed", () => {
    const manifestText = ["---", "pluginId: demo", "gdApiVersion: 1", "---"].join("\n");

    const zipBytes = zipSync({
      "plugins/demo/plugin.md": bytes(manifestText)
    });

    let caught: unknown;
    try {
      readZipSnapshotFromBytes(zipBytes);
    } catch (err) {
      caught = err;
    }

    expect(isImportError(caught)).toBe(true);
    if (isImportError(caught)) {
      expect(caught.info.source).toBe("zip");
      expect(caught.info.code).toBe("invalid_input");
      expect(caught.info.message).toMatch(/Plugin manifest parse failed/i);
    }
  });
});
