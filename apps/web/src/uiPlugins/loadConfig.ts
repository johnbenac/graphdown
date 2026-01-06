import type { DatasetSnapshot } from "../core/snapshotTypes";
import { isObject } from "../core/types";
import type { DatasetUiConfig, UiPluginWarning, UiResolutionConfig } from "./types";

const CONFIG_PATH = "graphdown.ui.json";

function isMatchObject(value: unknown): value is Record<string, string> {
  if (!isObject(value)) {
    return false;
  }
  return Object.values(value).every((entry) => typeof entry === "string");
}

function validateResolution(value: unknown): value is UiResolutionConfig {
  if (!isObject(value)) {
    return false;
  }
  if (typeof value.capability !== "string") {
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

function parseConfig(text: string): DatasetUiConfig | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isObject(parsed)) {
    return null;
  }
  if (parsed.schemaVersion !== 1) {
    return null;
  }
  if (parsed.resolutions === undefined) {
    return { schemaVersion: 1, resolutions: [] };
  }
  if (!Array.isArray(parsed.resolutions)) {
    return null;
  }
  if (!parsed.resolutions.every(validateResolution)) {
    return null;
  }
  return {
    schemaVersion: 1,
    resolutions: parsed.resolutions
  };
}

export function loadUiConfig(snapshot: DatasetSnapshot): {
  config: DatasetUiConfig | null;
  warnings: UiPluginWarning[];
} {
  const bytes = snapshot.files.get(CONFIG_PATH);
  if (!bytes) {
    return { config: null, warnings: [] };
  }

  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return {
      config: null,
      warnings: [{ message: "graphdown.ui.json is not valid UTF-8", path: CONFIG_PATH }]
    };
  }

  const config = parseConfig(text);
  if (!config) {
    return {
      config: null,
      warnings: [{ message: "graphdown.ui.json is invalid; ignoring UI resolutions", path: CONFIG_PATH }]
    };
  }

  return { config, warnings: [] };
}
