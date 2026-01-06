import React from "react";
import type { DatasetSnapshot } from "../core/snapshotTypes";
import type {
  FieldViewContext,
  ProviderRef,
  RecordViewContext,
  UiPluginManifest,
  UiPluginWarning
} from "./types";

function decodeUtf8(bytes: Uint8Array): string | null {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

function getCacheKey(manifest: UiPluginManifest): string {
  return `${manifest.id}@${manifest.version}`;
}

export function loadPluginExports(
  snapshot: DatasetSnapshot,
  manifest: UiPluginManifest,
  cache: Map<string, Record<string, unknown> | null>,
  onWarning?: (warning: UiPluginWarning) => void
): Record<string, unknown> {
  const cacheKey = getCacheKey(manifest);
  const cached = cache.get(cacheKey);
  if (cached !== undefined) {
    return cached ?? {};
  }

  const mainPath = manifest.main ?? "plugin.js";
  const filePath = `plugins/${manifest.id}/${mainPath}`;
  const bytes = snapshot.files.get(filePath);
  if (!bytes) {
    onWarning?.({ message: `Plugin "${manifest.id}" missing entry file ${filePath}`, pluginId: manifest.id });
    cache.set(cacheKey, null);
    return {};
  }

  const code = decodeUtf8(bytes);
  if (!code) {
    onWarning?.({ message: `Plugin "${manifest.id}" entry ${filePath} is not valid UTF-8`, pluginId: manifest.id });
    cache.set(cacheKey, null);
    return {};
  }

  const api = {
    React,
    h: React.createElement,
    Fragment: React.Fragment
  };

  try {
    const factory = new Function("api", code) as (api: unknown) => unknown;
    const exportsValue = factory(api);
    if (!exportsValue || typeof exportsValue !== "object") {
      onWarning?.({ message: `Plugin "${manifest.id}" did not return an exports object`, pluginId: manifest.id });
      cache.set(cacheKey, null);
      return {};
    }
    cache.set(cacheKey, exportsValue as Record<string, unknown>);
    return exportsValue as Record<string, unknown>;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    onWarning?.({ message: `Plugin "${manifest.id}" failed to load: ${message}`, pluginId: manifest.id });
    cache.set(cacheKey, null);
    return {};
  }
}

export function invokeFieldView(input: {
  snapshot: DatasetSnapshot;
  manifest: UiPluginManifest;
  provider: ProviderRef;
  ctx: FieldViewContext;
  cache: Map<string, Record<string, unknown> | null>;
  onWarning?: (warning: UiPluginWarning) => void;
}): React.ReactNode | null {
  const { snapshot, manifest, provider, ctx, cache, onWarning } = input;
  const exportsValue = loadPluginExports(snapshot, manifest, cache, onWarning);
  const entry = exportsValue[provider.entry];
  if (typeof entry !== "function") {
    onWarning?.({
      message: `Plugin "${provider.pluginId}" missing entry "${provider.entry}"`,
      pluginId: provider.pluginId
    });
    return null;
  }
  try {
    return (entry as (ctx: FieldViewContext) => React.ReactNode)(ctx);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    onWarning?.({ message: `Plugin "${provider.pluginId}" threw during render: ${message}`, pluginId: provider.pluginId });
    return null;
  }
}

export function invokeRecordView(input: {
  snapshot: DatasetSnapshot;
  manifest: UiPluginManifest;
  provider: ProviderRef;
  ctx: RecordViewContext;
  cache: Map<string, Record<string, unknown> | null>;
  onWarning?: (warning: UiPluginWarning) => void;
}): React.ReactNode | null {
  const { snapshot, manifest, provider, ctx, cache, onWarning } = input;
  const exportsValue = loadPluginExports(snapshot, manifest, cache, onWarning);
  const entry = exportsValue[provider.entry];
  if (typeof entry !== "function") {
    onWarning?.({
      message: `Plugin "${provider.pluginId}" missing entry "${provider.entry}"`,
      pluginId: provider.pluginId
    });
    return null;
  }
  try {
    return (entry as (ctx: RecordViewContext) => React.ReactNode)(ctx);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    onWarning?.({ message: `Plugin "${provider.pluginId}" threw during render: ${message}`, pluginId: provider.pluginId });
    return null;
  }
}
