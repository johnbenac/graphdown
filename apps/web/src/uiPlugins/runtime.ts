import React from "react";
import type { DatasetSnapshot } from "../core/snapshotTypes";
import type { FieldViewContext, ProviderRef, UiPluginManifest, UiPluginWarning } from "./types";

const textDecoder =
  typeof TextDecoder !== "undefined" ? new TextDecoder("utf-8", { fatal: true }) : null;

const exportsCache = new Map<string, Record<string, unknown>>();

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

function cacheKey(manifest: UiPluginManifest): string {
  return `${manifest.id}@${manifest.version}`;
}

export function loadPluginExports(
  snapshot: DatasetSnapshot,
  manifest: UiPluginManifest,
  onWarning?: (warning: UiPluginWarning) => void
): Record<string, unknown> | null {
  const key = cacheKey(manifest);
  const cached = exportsCache.get(key);
  if (cached) {
    return cached;
  }
  const mainPath = `plugins/${manifest.id}/${manifest.main ?? "plugin.js"}`;
  const bytes = snapshot.files.get(mainPath);
  if (!bytes) {
    onWarning?.({ message: `Plugin ${manifest.id} is missing entry file ${mainPath}.` });
    return null;
  }
  const decoded = decodeUtf8(bytes);
  if (!decoded.ok) {
    onWarning?.({
      message: `Plugin ${manifest.id} entry file ${mainPath} is not valid UTF-8 (${decoded.error}).`
    });
    return null;
  }
  let factory: ((api: unknown) => unknown) | null = null;
  try {
    factory = new Function("api", decoded.text) as (api: unknown) => unknown;
  } catch (error) {
    onWarning?.({
      message: `Plugin ${manifest.id} entry file ${mainPath} failed to compile (${String(error)}).`
    });
    return null;
  }
  let exportsValue: unknown;
  try {
    const api = {
      React,
      h: React.createElement,
      Fragment: React.Fragment
    };
    exportsValue = factory(api);
  } catch (error) {
    onWarning?.({
      message: `Plugin ${manifest.id} entry file ${mainPath} threw during initialization (${String(error)}).`
    });
    return null;
  }
  if (!exportsValue || typeof exportsValue !== "object") {
    onWarning?.({ message: `Plugin ${manifest.id} entry file ${mainPath} did not return an exports object.` });
    return null;
  }
  exportsCache.set(key, exportsValue as Record<string, unknown>);
  return exportsValue as Record<string, unknown>;
}

export function invokeFieldView(input: {
  snapshot: DatasetSnapshot;
  manifest: UiPluginManifest | undefined;
  provider: ProviderRef;
  ctx: FieldViewContext;
  onWarning?: (warning: UiPluginWarning) => void;
}): React.ReactNode | null {
  const { snapshot, manifest, provider, ctx, onWarning } = input;
  if (!manifest) {
    onWarning?.({ message: `Missing manifest for plugin ${provider.pluginId}.` });
    return null;
  }
  const exportsValue = loadPluginExports(snapshot, manifest, onWarning);
  if (!exportsValue) {
    return null;
  }
  const entry = exportsValue[provider.entry];
  if (typeof entry !== "function") {
    onWarning?.({
      message: `Plugin ${provider.pluginId} does not export function "${provider.entry}".`
    });
    return null;
  }
  try {
    return (entry as (ctx: FieldViewContext) => React.ReactNode)(ctx);
  } catch (error) {
    onWarning?.({
      message: `Plugin ${provider.pluginId} threw while rendering "${provider.entry}" (${String(error)}).`
    });
    return null;
  }
}
