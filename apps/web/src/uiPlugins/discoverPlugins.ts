import type { DatasetSnapshot } from "../core/snapshotTypes";
import { isObject } from "../core/types";
import type { PluginCatalog, UiPluginManifest, UiPluginProvider, UiPluginWarning } from "./types";

const textDecoder =
  typeof TextDecoder !== "undefined" ? new TextDecoder("utf-8", { fatal: true }) : null;

const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/;

function decodeUtf8(bytes: Uint8Array): { ok: true; text: string } | { ok: false; error: string } {
  if (textDecoder) {
    try {
      return { ok: true, text: textDecoder.decode(bytes) };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Invalid UTF-8" };
    }
  }
  if (typeof Buffer !== "undefined") {
    return { ok: true, text: Buffer.from(bytes).toString("utf8") };
  }
  return { ok: true, text: String.fromCharCode(...bytes) };
}

function isSafeRelativePath(value: string): boolean {
  if (!value || value.startsWith("/")) {
    return false;
  }
  const segments = value.split("/");
  return segments.every((segment) => segment !== "" && segment !== "." && segment !== "..");
}

function isMatchObject(value: unknown): value is Record<string, string> {
  if (!isObject(value)) {
    return false;
  }
  return Object.values(value).every((entry) => typeof entry === "string");
}

function isProvider(value: unknown): value is UiPluginProvider {
  if (!isObject(value)) {
    return false;
  }
  if (value.capability !== "field.view") {
    return false;
  }
  if (!isMatchObject(value.match)) {
    return false;
  }
  if (typeof value.entry !== "string") {
    return false;
  }
  return true;
}

function parseManifest(raw: string, pluginId: string): UiPluginManifest | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObject(parsed)) {
    return null;
  }
  if (parsed.schemaVersion !== 1) {
    return null;
  }
  if (parsed.id !== pluginId) {
    return null;
  }
  if (typeof parsed.version !== "string" || !SEMVER_PATTERN.test(parsed.version)) {
    return null;
  }
  const mainValue = parsed.main ?? "plugin.js";
  if (typeof mainValue !== "string" || !isSafeRelativePath(mainValue)) {
    return null;
  }
  if (!Array.isArray(parsed.provides) || !parsed.provides.every((provider) => isProvider(provider))) {
    return null;
  }
  return {
    schemaVersion: 1,
    id: pluginId,
    version: parsed.version,
    main: mainValue,
    provides: parsed.provides as UiPluginProvider[]
  };
}

export function discoverPlugins(snapshot: DatasetSnapshot): {
  catalog: PluginCatalog;
  warnings: UiPluginWarning[];
} {
  const manifestsById = new Map<string, UiPluginManifest>();
  const providers: PluginCatalog["providers"] = [];
  const warnings: UiPluginWarning[] = [];

  for (const [path, bytes] of snapshot.files.entries()) {
    const segments = path.split("/");
    if (segments.length !== 3) {
      continue;
    }
    if (segments[0] !== "plugins" || segments[2] !== "plugin.json") {
      continue;
    }
    const pluginId = segments[1];
    const decoded = decodeUtf8(bytes);
    if (!decoded.ok) {
      warnings.push({ message: `Plugin manifest ${path} is not valid UTF-8 (${decoded.error}).` });
      continue;
    }
    const manifest = parseManifest(decoded.text, pluginId);
    if (!manifest) {
      warnings.push({ message: `Plugin manifest ${path} is invalid and was ignored.` });
      continue;
    }
    manifestsById.set(pluginId, manifest);
    const mainPath = `plugins/${pluginId}/${manifest.main ?? "plugin.js"}`;
    manifest.provides.forEach((provider, index) => {
      providers.push({
        pluginId,
        version: manifest.version,
        mainPath,
        capability: provider.capability,
        match: provider.match,
        entry: provider.entry,
        index
      });
    });
  }

  return { catalog: { manifestsById, providers }, warnings };
}
