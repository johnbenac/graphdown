import type { DatasetSnapshot } from "../core/snapshotTypes";
import { isObject } from "../core/types";
import type { DatasetUiConfig, UiPluginWarning, UiResolutionConfig, UiMatch } from "./types";

const textDecoder =
  typeof TextDecoder !== "undefined" ? new TextDecoder("utf-8", { fatal: true }) : null;

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

function isResolutionConfig(value: unknown): value is UiResolutionConfig {
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

export function loadUiConfig(
  snapshot: DatasetSnapshot
): { config: DatasetUiConfig | null; warnings: UiPluginWarning[] } {
  const warnings: UiPluginWarning[] = [];
  const bytes = snapshot.files.get("graphdown.ui.json");
  if (!bytes) {
    return { config: null, warnings };
  }
  const decoded = decodeUtf8(bytes);
  if (decoded === null) {
    warnings.push({
      message: 'Failed to decode "graphdown.ui.json" as UTF-8; ignoring UI resolutions.'
    });
    return { config: null, warnings };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(decoded);
  } catch {
    warnings.push({
      message: 'Invalid JSON in "graphdown.ui.json"; ignoring UI resolutions.'
    });
    return { config: null, warnings };
  }
  if (!isObject(parsed) || parsed.schemaVersion !== 1) {
    warnings.push({
      message: 'Invalid schema in "graphdown.ui.json"; expected schemaVersion 1.'
    });
    return { config: null, warnings };
  }
  if (
    parsed.resolutions !== undefined &&
    (!Array.isArray(parsed.resolutions) || !parsed.resolutions.every(isResolutionConfig))
  ) {
    warnings.push({
      message: 'Invalid "resolutions" in "graphdown.ui.json"; ignoring UI resolutions.'
    });
    return { config: null, warnings };
  }
  const config: DatasetUiConfig = {
    schemaVersion: 1,
    resolutions: parsed.resolutions as UiResolutionConfig[] | undefined
  };
  return { config, warnings };
}
