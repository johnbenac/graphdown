import type { DatasetSnapshot } from "../core/snapshotTypes";
import { isObject } from "../core/types";
import type {
  PluginCatalog,
  ProviderRef,
  UiPluginManifest,
  UiPluginProvider,
  UiPluginWarning,
  UiMatch
} from "./types";

const textDecoder =
  typeof TextDecoder !== "undefined" ? new TextDecoder("utf-8", { fatal: true }) : null;

const SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

function decodeUtf8(bytes: Uint8Array): string | null {
  if (!textDecoder) {
    return null;
  }
  try {
    return textDecoder.decode(bytes);
  } catch {
    return null;
  }
}

function isMatchObject(value: unknown): value is UiMatch {
  if (!isObject(value)) {
    return false;
  }
  return Object.values(value).every((entry) => typeof entry === "string");
}

function isPluginProvider(value: unknown): value is UiPluginProvider {
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

function isValidRelativePath(value: string): boolean {
  if (!value || value.startsWith("/") || value.includes("\0")) {
    return false;
  }
  const segments = value.split("/");
  return segments.every((segment) => segment !== "" && segment !== "." && segment !== "..");
}

function parseManifest(
  pluginId: string,
  path: string,
  decoded: string
): { manifest: UiPluginManifest | null; warning?: UiPluginWarning } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(decoded);
  } catch {
    return {
      manifest: null,
      warning: { message: `Invalid JSON in ${path}; plugin ignored.` }
    };
  }
  if (!isObject(parsed)) {
    return {
      manifest: null,
      warning: { message: `Invalid plugin manifest shape in ${path}; plugin ignored.` }
    };
  }
  if (parsed.schemaVersion !== 1) {
    return {
      manifest: null,
      warning: { message: `Invalid plugin manifest schemaVersion in ${path}; plugin ignored.` }
    };
  }
  if (parsed.id !== pluginId) {
    return {
      manifest: null,
      warning: { message: `Plugin id mismatch in ${path}; plugin ignored.` }
    };
  }
  if (typeof parsed.version !== "string" || !SEMVER_PATTERN.test(parsed.version)) {
    return {
      manifest: null,
      warning: { message: `Invalid plugin version in ${path}; plugin ignored.` }
    };
  }
  const main =
    parsed.main === undefined ? "plugin.js" : typeof parsed.main === "string" ? parsed.main : null;
  if (!main || !isValidRelativePath(main)) {
    return {
      manifest: null,
      warning: { message: `Invalid plugin main entry in ${path}; plugin ignored.` }
    };
  }
  if (!Array.isArray(parsed.provides) || !parsed.provides.every(isPluginProvider)) {
    return {
      manifest: null,
      warning: { message: `Invalid plugin providers in ${path}; plugin ignored.` }
    };
  }
  return {
    manifest: {
      schemaVersion: 1,
      id: pluginId,
      version: parsed.version,
      main,
      provides: parsed.provides as UiPluginProvider[]
    }
  };
}

export function discoverPlugins(
  snapshot: DatasetSnapshot
): { catalog: PluginCatalog; warnings: UiPluginWarning[] } {
  const warnings: UiPluginWarning[] = [];
  const manifestsById = new Map<string, UiPluginManifest>();
  const providers: ProviderRef[] = [];

  for (const [path, bytes] of snapshot.files.entries()) {
    const parts = path.split("/");
    if (parts.length !== 3 || parts[0] !== "plugins" || parts[2] !== "plugin.json") {
      continue;
    }
    const pluginId = parts[1];
    const decoded = decodeUtf8(bytes);
    if (!decoded) {
      warnings.push({
        message: `Failed to decode ${path} as UTF-8; plugin ignored.`
      });
      continue;
    }
    const parsed = parseManifest(pluginId, path, decoded);
    if (!parsed.manifest) {
      if (parsed.warning) {
        warnings.push(parsed.warning);
      }
      continue;
    }
    if (manifestsById.has(pluginId)) {
      warnings.push({
        message: `Duplicate plugin id "${pluginId}" found at ${path}; plugin ignored.`
      });
      continue;
    }
    manifestsById.set(pluginId, parsed.manifest);
    const mainPath = `plugins/${pluginId}/${parsed.manifest.main}`;
    parsed.manifest.provides.forEach((provider, index) => {
      providers.push({
        pluginId,
        version: parsed.manifest.version,
        mainPath,
        capability: provider.capability,
        match: provider.match,
        entry: provider.entry,
        providerIndex: index
      });
    });
  }

  return { catalog: { manifestsById, providers }, warnings };
}
