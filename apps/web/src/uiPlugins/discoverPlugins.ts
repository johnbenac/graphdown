import type { DatasetSnapshot } from "../core/snapshotTypes";
import { isObject } from "../core/types";
import type {
  PluginCatalog,
  ProviderRef,
  UiPluginManifest,
  UiPluginProvider,
  UiPluginWarning
} from "./types";

const MANIFEST_FILES = new Set(["plugin.json", "manifest.json"]);
const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;
const PLUGIN_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

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

function isValidEntryPath(value: unknown): value is string {
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

function normalizeCapability(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (value === "recordView") return "record.view";
  return value;
}

function validateProvider(
  value: unknown,
  pluginId: string,
  index: number
): { provider: UiPluginProvider | null; warnings: UiPluginWarning[] } {
  const warnings: UiPluginWarning[] = [];
  if (!isObject(value)) {
    return { provider: null, warnings };
  }
  const capability = normalizeCapability(value.capability);
  if (!capability) {
    return { provider: null, warnings };
  }
  if (!isMatchObject(value.match)) {
    return { provider: null, warnings };
  }
  let providerId = typeof value.id === "string" && value.id.trim() ? value.id : "";
  if (!providerId) {
    providerId = `provider-${index}`;
    warnings.push({ message: `Provider missing id; synthesized ${providerId}`, pluginId });
  }
  const title = typeof value.title === "string" ? value.title : undefined;
  return {
    provider: {
      id: providerId,
      capability,
      match: value.match,
      ...(title ? { title } : {})
    },
    warnings
  };
}

function pickEntry(
  pluginId: string,
  rawEntry: unknown,
  files: Set<string>
): { entry: string; warning?: UiPluginWarning } | null {
  if (rawEntry !== undefined) {
    if (!isValidEntryPath(rawEntry)) {
      return null;
    }
    return { entry: rawEntry };
  }
  const root = `plugins/${pluginId}/`;
  const preferred = [`${root}plugin.js`, `${root}${pluginId}.js`].find((p) => files.has(p));
  if (preferred) {
    return { entry: preferred.slice(root.length) };
  }
  const candidates = [...files]
    .filter((p) => p.startsWith(root) && !p.slice(root.length).includes("/") && p.endsWith(".js"))
    .sort((a, b) => a.localeCompare(b));
  if (candidates.length) {
    const picked = candidates[0];
    return {
      entry: picked.slice(root.length),
      warning: { message: `Inferred entry "${picked.slice(root.length)}" for plugin "${pluginId}"`, pluginId }
    };
  }
  return null;
}

function validateManifest(
  raw: unknown,
  pluginId: string,
  fileSet: Set<string>
): { manifest: UiPluginManifest | null; warnings: UiPluginWarning[] } {
  const warnings: UiPluginWarning[] = [];
  if (!isObject(raw)) {
    return { manifest: null, warnings };
  }
  if (raw.id !== pluginId) {
    warnings.push({ message: `Plugin id mismatch for ${pluginId}`, pluginId });
    return { manifest: null, warnings };
  }

  let version = "0.0.0";
  if (typeof raw.version === "string" && VERSION_PATTERN.test(raw.version)) {
    version = raw.version;
  } else if (raw.version !== undefined) {
    warnings.push({ message: `Invalid version for plugin "${pluginId}", defaulting to 0.0.0`, pluginId });
  }

  const entryResult = pickEntry(pluginId, raw.entry, fileSet);
  if (!entryResult) {
    warnings.push({ message: `Plugin "${pluginId}" missing entry point`, pluginId });
    return { manifest: null, warnings };
  }
  if (entryResult.warning) {
    warnings.push(entryResult.warning);
  }

  const providers: UiPluginProvider[] = [];
  if (Array.isArray(raw.providers)) {
    raw.providers.forEach((value, index) => {
      const parsed = validateProvider(value, pluginId, index);
      warnings.push(...parsed.warnings);
      if (parsed.provider) {
        providers.push(parsed.provider);
      } else {
        warnings.push({ message: `Invalid provider entry in plugin "${pluginId}" ignored`, pluginId });
      }
    });
  } else if (raw.providers !== undefined) {
    warnings.push({ message: `Plugin "${pluginId}" providers must be an array`, pluginId });
  }

  if (!providers.length) {
    warnings.push({ message: `Plugin "${pluginId}" has no valid providers`, pluginId });
    return { manifest: null, warnings };
  }

  return {
    manifest: {
      id: pluginId,
      version,
      entry: entryResult.entry,
      providers
    },
    warnings
  };
}

export function discoverPlugins(snapshot: DatasetSnapshot): {
  catalog: PluginCatalog;
  warnings: UiPluginWarning[];
} {
  const manifestsById = new Map<string, UiPluginManifest>();
  const providers: ProviderRef[] = [];
  const warnings: UiPluginWarning[] = [];
  const filePaths = [...snapshot.files.keys()].sort((a, b) => a.localeCompare(b));
  const filesSet = new Set(filePaths);
  const pluginRoots = new Map<string, { manifestPath: string | null; files: string[] }>();

  for (const path of filePaths) {
    const segments = path.split("/");
    if (segments[0] !== "plugins" || segments.length < 2) {
      continue;
    }
    const pluginId = segments[1];
    if (!PLUGIN_ID_PATTERN.test(pluginId)) {
      warnings.push({ message: `Invalid plugin id path segment "${pluginId}"`, path });
      continue;
    }
    const root = `plugins/${pluginId}`;
    const info = pluginRoots.get(pluginId) ?? { manifestPath: null, files: [] };
    info.files.push(path);
    const basename = segments[segments.length - 1];
    if (MANIFEST_FILES.has(basename)) {
      if (!info.manifestPath || path.endsWith("plugin.json")) {
        info.manifestPath = path;
      }
    }
    pluginRoots.set(pluginId, info);
  }

  for (const [pluginId, info] of pluginRoots.entries()) {
    const manifestPath = info.manifestPath;
    if (!manifestPath) {
      warnings.push({ message: `Plugin "${pluginId}" missing manifest`, pluginId });
      continue;
    }
    const bytes = snapshot.files.get(manifestPath);
    if (!bytes) continue;
    const text = decodeUtf8(bytes);
    if (!text) {
      warnings.push({ message: `Plugin manifest at ${manifestPath} is not valid UTF-8`, path: manifestPath, pluginId });
      continue;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      warnings.push({ message: `Plugin manifest at ${manifestPath} is invalid JSON`, path: manifestPath, pluginId });
      continue;
    }
    const { manifest, warnings: manifestWarnings } = validateManifest(parsed, pluginId, filesSet);
    warnings.push(...manifestWarnings.map((w) => ({ ...w, path: w.path ?? manifestPath })));
    if (!manifest) {
      continue;
    }
    if (manifestsById.has(manifest.id)) {
      warnings.push({ message: `Duplicate plugin id "${manifest.id}" at ${manifestPath} was ignored`, path: manifestPath, pluginId });
      continue;
    }
    manifestsById.set(manifest.id, manifest);
    manifest.providers.forEach((provider, index) => {
      providers.push({
        pluginId: manifest.id,
        version: manifest.version,
        entry: manifest.entry,
        capability: provider.capability,
        match: provider.match,
        providerId: provider.id,
        title: provider.title,
        providerIndex: index
      });
    });
  }

  return { catalog: { manifestsById, providers }, warnings };
}
