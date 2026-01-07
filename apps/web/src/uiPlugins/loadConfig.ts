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

function parseResolution(value: unknown): UiResolutionConfig | null {
  if (!isObject(value)) {
    return null;
  }
  if (typeof value.capability !== "string") {
    return null;
  }
  if (!isMatchObject(value.match)) {
    return null;
  }
  if (typeof value.use !== "string") {
    return null;
  }
  const providerId = typeof value.providerId === "string" ? value.providerId : undefined;
  return {
    capability: value.capability,
    match: value.match,
    use: value.use,
    ...(providerId ? { providerId } : {})
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

  const warnings: UiPluginWarning[] = [];

  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return {
      config: null,
      warnings: [{ message: "graphdown.ui.json is not valid UTF-8", path: CONFIG_PATH }]
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return {
      config: null,
      warnings: [{ message: "graphdown.ui.json is invalid JSON; ignoring UI resolutions", path: CONFIG_PATH }]
    };
  }

  if (!isObject(parsed)) {
    return {
      config: null,
      warnings: [{ message: "graphdown.ui.json must be a JSON object; ignoring UI resolutions", path: CONFIG_PATH }]
    };
  }

  const rawResolutions = (parsed as Record<string, unknown>).resolutions;
  if (rawResolutions === undefined) {
    return { config: { resolutions: [] }, warnings };
  }

  if (!Array.isArray(rawResolutions)) {
    warnings.push({
      message: "graphdown.ui.json resolutions must be an array; ignoring",
      path: CONFIG_PATH
    });
    return { config: { resolutions: [] }, warnings };
  }

  const resolutions: UiResolutionConfig[] = [];
  for (const entry of rawResolutions) {
    const parsedResolution = parseResolution(entry);
    if (!parsedResolution) {
      warnings.push({ message: "Invalid resolution entry ignored", path: CONFIG_PATH });
      continue;
    }
    resolutions.push(parsedResolution);
  }

  return { config: { resolutions }, warnings };
}
