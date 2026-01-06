import type { DatasetSnapshot } from "../core/snapshotTypes";
import type { DatasetUiConfig, UiPluginWarning } from "./types";

const textDecoder = typeof TextDecoder !== "undefined" ? new TextDecoder("utf-8", { fatal: true }) : null;

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

function isUiResolution(value: unknown): value is DatasetUiConfig["resolutions"] {
  if (value === undefined) {
    return true;
  }
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
      typeof record.use === "string" &&
      record.match &&
      typeof record.match === "object" &&
      !Array.isArray(record.match) &&
      Object.values(record.match as Record<string, unknown>).every((val) => typeof val === "string")
    );
  });
}

export function loadDatasetUiConfig(snapshot: DatasetSnapshot): {
  config: DatasetUiConfig | null;
  warnings: UiPluginWarning[];
} {
  const bytes = snapshot.files.get("graphdown.ui.json");
  if (!bytes) {
    return { config: null, warnings: [] };
  }

  const decoded = decodeUtf8(bytes);
  if (!decoded.ok) {
    return {
      config: null,
      warnings: [{ message: "graphdown.ui.json is not valid UTF-8." }]
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(decoded.text);
  } catch {
    return {
      config: null,
      warnings: [{ message: "graphdown.ui.json contains invalid JSON." }]
    };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {
      config: null,
      warnings: [{ message: "graphdown.ui.json must be an object." }]
    };
  }

  const record = parsed as Record<string, unknown>;
  if (record.schemaVersion !== 1) {
    return {
      config: null,
      warnings: [{ message: "graphdown.ui.json schemaVersion must be 1." }]
    };
  }

  if (!isUiResolution(record.resolutions)) {
    return {
      config: null,
      warnings: [{ message: "graphdown.ui.json resolutions must match the expected schema." }]
    };
  }

  return {
    config: record as DatasetUiConfig,
    warnings: []
  };
}
