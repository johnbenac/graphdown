import React from "react";
import type { DatasetSnapshot } from "../core/snapshotTypes";
import type { FieldViewContext, PluginCatalog, ProviderRef, UiPluginManifest } from "./types";

const textDecoder =
  typeof TextDecoder !== "undefined" ? new TextDecoder("utf-8", { fatal: true }) : null;

const exportsCache = new Map<string, Record<string, unknown> | null>();

function cacheKey(manifest: UiPluginManifest): string {
  return `${manifest.id}@${manifest.version}`;
}

export function loadPluginExports(
  snapshot: DatasetSnapshot,
  manifest: UiPluginManifest
): Record<string, unknown> | null {
  const key = cacheKey(manifest);
  if (exportsCache.has(key)) {
    return exportsCache.get(key) ?? null;
  }
  if (!textDecoder) {
    console.warn(`TextDecoder unavailable; plugin "${manifest.id}" cannot be loaded.`);
    exportsCache.set(key, null);
    return null;
  }
  const mainPath = `plugins/${manifest.id}/${manifest.main}`;
  const bytes = snapshot.files.get(mainPath);
  if (!bytes) {
    console.warn(`Plugin "${manifest.id}" missing main file at ${mainPath}.`);
    exportsCache.set(key, null);
    return null;
  }
  let code: string;
  try {
    code = textDecoder.decode(bytes);
  } catch {
    console.warn(`Plugin "${manifest.id}" main file is not valid UTF-8.`);
    exportsCache.set(key, null);
    return null;
  }
  let exportsValue: unknown;
  try {
    const api = {
      React,
      h: React.createElement,
      Fragment: React.Fragment
    };
    const factory = new Function("api", code) as (api: unknown) => unknown;
    exportsValue = factory(api);
  } catch (error) {
    console.warn(`Plugin "${manifest.id}" failed to evaluate.`, error);
    exportsCache.set(key, null);
    return null;
  }
  if (!exportsValue || typeof exportsValue !== "object") {
    console.warn(`Plugin "${manifest.id}" did not return an exports object.`);
    exportsCache.set(key, null);
    return null;
  }
  exportsCache.set(key, exportsValue as Record<string, unknown>);
  return exportsValue as Record<string, unknown>;
}

export function createUiPluginRuntime(snapshot: DatasetSnapshot, catalog: PluginCatalog) {
  return {
    invokeFieldView(providerRef: ProviderRef, ctx: FieldViewContext): React.ReactNode | null {
      const manifest = catalog.manifestsById.get(providerRef.pluginId);
      if (!manifest) {
        console.warn(`Plugin "${providerRef.pluginId}" not found in catalog.`);
        return null;
      }
      const exportsValue = loadPluginExports(snapshot, manifest);
      if (!exportsValue) {
        return null;
      }
      const entry = exportsValue[providerRef.entry];
      if (typeof entry !== "function") {
        console.warn(
          `Plugin "${providerRef.pluginId}" entry "${providerRef.entry}" is not a function.`
        );
        return null;
      }
      try {
        return entry(ctx) as React.ReactNode;
      } catch (error) {
        console.warn(
          `Plugin "${providerRef.pluginId}" entry "${providerRef.entry}" threw an error.`,
          error
        );
        return null;
      }
    }
  };
}
