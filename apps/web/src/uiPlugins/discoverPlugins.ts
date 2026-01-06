import type { DatasetSnapshot } from "../core/snapshotTypes";
import type { ProviderRef, UiPluginManifest, UiPluginWarning } from "./types";

const textDecoder = typeof TextDecoder !== "undefined" ? new TextDecoder("utf-8", { fatal: true }) : null;

export type PluginCatalog = {
  manifestsById: Map<string, UiPluginManifest>;
  providers: ProviderRef[];
  warnings: UiPluginWarning[];
};

function decodeUtf8(bytes: Uint8Array): { ok: true; text: string } | { ok: false } {
  if (!textDecoder) {
    return { ok: false };
  }
  try {
    return { ok: true, text: textDecoder.decode(bytes) };
  } catch {
    return { ok: false };
  }
}

function isMatchObject(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  return Object.values(value as Record<string, unknown>).every((entry) => typeof entry === "string");
}

function isProviderArray(value: unknown): value is UiPluginManifest["provides"] {
  if (!Array.isArray(value)) {
    return false;
  }
  return value.every((entry) => {
    if (!entry || typeof entry !== "object") {
      return false;
    }
    const record = entry as Record<string, unknown>;
    return (
      record.capability === "field.view" &&
      typeof record.entry === "string" &&
      isMatchObject(record.match)
    );
  });
}

function isSemverLike(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }
  return /^\d+\.\d+\.\d+$/.test(value);
}

function isValidMainPath(value: unknown): value is string {
  if (value === undefined) {
    return true;
  }
  if (typeof value !== "string") {
    return false;
  }
  if (!value) {
    return false;
  }
  return !value.startsWith("/") && !value.includes("..") && !value.includes("\\");
}

export function discoverPlugins(snapshot: DatasetSnapshot): PluginCatalog {
  const manifestsById = new Map<string, UiPluginManifest>();
  const providers: ProviderRef[] = [];
  const warnings: UiPluginWarning[] = [];

  for (const [path, bytes] of snapshot.files.entries()) {
    if (!path.startsWith("plugins/")) {
      continue;
    }
    const segments = path.split("/");
    if (segments.length !== 3) {
      continue;
    }
    const [root, pluginId, fileName] = segments;
    if (root !== "plugins" || fileName !== "plugin.json") {
      continue;
    }
    const decoded = decodeUtf8(bytes);
    if (!decoded.ok) {
      warnings.push({ message: `Plugin manifest ${path} is not valid UTF-8.` });
      continue;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(decoded.text);
    } catch {
      warnings.push({ message: `Plugin manifest ${path} contains invalid JSON.` });
      continue;
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      warnings.push({ message: `Plugin manifest ${path} must be an object.` });
      continue;
    }
    const record = parsed as Record<string, unknown>;
    if (record.schemaVersion !== 1) {
      warnings.push({ message: `Plugin manifest ${path} schemaVersion must be 1.` });
      continue;
    }
    if (record.id !== pluginId || typeof record.id !== "string") {
      warnings.push({ message: `Plugin manifest ${path} id must match ${pluginId}.` });
      continue;
    }
    if (!isSemverLike(record.version)) {
      warnings.push({ message: `Plugin manifest ${path} version must be MAJOR.MINOR.PATCH.` });
      continue;
    }
    if (!isValidMainPath(record.main)) {
      warnings.push({ message: `Plugin manifest ${path} main must be a relative path.` });
      continue;
    }
    if (!isProviderArray(record.provides)) {
      warnings.push({ message: `Plugin manifest ${path} provides must include valid providers.` });
      continue;
    }

    const manifest: UiPluginManifest = {
      schemaVersion: 1,
      id: pluginId,
      version: record.version as string,
      main: typeof record.main === "string" ? record.main : undefined,
      provides: record.provides as UiPluginManifest["provides"]
    };
    manifestsById.set(pluginId, manifest);
    const mainPath = manifest.main ?? "plugin.js";
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

  return { manifestsById, providers, warnings };
}
