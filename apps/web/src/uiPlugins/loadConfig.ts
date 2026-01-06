import type { DatasetSnapshot } from "../core/snapshotTypes";
import type { DatasetUiConfig, UiPluginWarning, UiResolutionConfig } from "./types";
import { isObject } from "../core/types";

const textDecoder =
  typeof TextDecoder !== "undefined" ? new TextDecoder("utf-8", { fatal: true }) : null;

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

function isMatchObject(value: unknown): value is Record<string, string> {
  if (!isObject(value)) {
    return false;
  }
  return Object.values(value).every((entry) => typeof entry === "string");
}

function isResolutionEntry(value: unknown): value is UiResolutionConfig {
  if (!isObject(value)) {
    return false;
  }
  if (value.capability !== "field.view") {
    return false;
  }
  if (!isMatchObject(value.match)) {
    return false;
  }
  if (typeof value.use !== "string") {
    return false;
  }
  return true;
}

function parseDatasetUiConfig(raw: string): DatasetUiConfig | null {
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
  if (parsed.resolutions !== undefined) {
    if (!Array.isArray(parsed.resolutions)) {
      return null;
    }
    if (!parsed.resolutions.every((entry) => isResolutionEntry(entry))) {
      return null;
    }
  }
  return parsed as DatasetUiConfig;
}

export function loadDatasetUiConfig(snapshot: DatasetSnapshot): {
  config: DatasetUiConfig | null;
  warnings: UiPluginWarning[];
} {
  const warnings: UiPluginWarning[] = [];
  const bytes = snapshot.files.get("graphdown.ui.json");
  if (!bytes) {
    return { config: null, warnings };
  }
  const decoded = decodeUtf8(bytes);
  if (!decoded.ok) {
    warnings.push({ message: `graphdown.ui.json is not valid UTF-8 (${decoded.error}).` });
    return { config: null, warnings };
  }
  const config = parseDatasetUiConfig(decoded.text);
  if (!config) {
    warnings.push({ message: "graphdown.ui.json is invalid; ignoring UI resolutions." });
    return { config: null, warnings };
  }
  return { config, warnings };
}
