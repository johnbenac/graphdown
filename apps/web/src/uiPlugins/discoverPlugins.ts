import type { DatasetSnapshot } from "../core/snapshotTypes";
import { isObject } from "../core/types";
import type {
  PluginCatalog,
  ProviderRef,
  UiPluginManifest,
  UiPluginProvider,
  UiPluginWarning
} from "./types";

const MANIFEST_FILE = "plugin.json";
const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

function decodeUtf8(bytes: Uint8Array): string | null {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

function isMatchObject(value: unknown): value is Record<string, string> {
  if (!isObject(value)) {
    return false;
  }
  return Object.values(value).every((entry) => typeof entry === "string");
}

function isValidMainPath(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }
  if (!value.trim()) {
    return false;
  }
  if (value.startsWith("/")) {
    return false;
  }
  if (value.includes("\\")) {
    return false;
  }
  const segments = value.split("/");
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    return false;
  }
  return true;
}

function validateProvider(value: unknown): value is UiPluginProvider {
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

function validateManifest(raw: unknown, pluginId: string): UiPluginManifest | null {
  if (!isObject(raw)) {
    return null;
  }
  if (raw.schemaVersion !== 1) {
    return null;
  }
  if (raw.id !== pluginId) {
    return null;
  }
  if (typeof raw.version !== "string" || !VERSION_PATTERN.test(raw.version)) {
    return null;
  }
  const main = raw.main === undefined ? "plugin.js" : raw.main;
  if (!isValidMainPath(main)) {
    return null;
  }
  if (!Array.isArray(raw.provides) || !raw.provides.every(validateProvider)) {
    return null;
  }
  return {
    schemaVersion: 1,
    id: pluginId,
    version: raw.version,
    main,
    provides: raw.provides
  };
}

export function discoverPlugins(snapshot: DatasetSnapshot): {
  catalog: PluginCatalog;
  warnings: UiPluginWarning[];
} {
  const manifestsById = new Map<string, UiPluginManifest>();
  const providers: ProviderRef[] = [];
  const warnings: UiPluginWarning[] = [];

  const files = [...snapshot.files.keys()].sort((a, b) => a.localeCompare(b));
  for (const path of files) {
    const segments = path.split("/");
    if (segments.length !== 3) {
      continue;
    }
    if (segments[0] !== "plugins" || segments[2] !== MANIFEST_FILE) {
      continue;
    }
    const pluginId = segments[1];
    const bytes = snapshot.files.get(path);
    if (!bytes) {
      continue;
    }
    const text = decodeUtf8(bytes);
    if (!text) {
      warnings.push({ message: `Plugin manifest at ${path} is not valid UTF-8`, path });
      continue;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      warnings.push({ message: `Plugin manifest at ${path} is invalid JSON`, path });
      continue;
    }
    const manifest = validateManifest(parsed, pluginId);
    if (!manifest) {
      warnings.push({ message: `Plugin manifest at ${path} is invalid and was ignored`, path, pluginId });
      continue;
    }
    if (manifestsById.has(manifest.id)) {
      warnings.push({ message: `Duplicate plugin id "${manifest.id}" at ${path} was ignored`, path, pluginId });
      continue;
    }
    manifestsById.set(manifest.id, manifest);
    manifest.provides.forEach((provider, index) => {
      providers.push({
        pluginId: manifest.id,
        version: manifest.version,
        main: manifest.main ?? "plugin.js",
        capability: provider.capability,
        match: provider.match,
        entry: provider.entry,
        providerIndex: index
      });
    });
  }

  return { catalog: { manifestsById, providers }, warnings };
}
