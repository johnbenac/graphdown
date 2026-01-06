import React from "react";
import type { DatasetSnapshot } from "../core/snapshotTypes";
import type { ProviderRef, UiPluginManifest } from "./types";

const decoder = typeof TextDecoder !== "undefined" ? new TextDecoder("utf-8") : null;

type PluginExport = Record<string, unknown>;

type RuntimeCacheEntry = {
  exports: PluginExport | null;
  warnings: string[];
};

const runtimeCache = new Map<string, RuntimeCacheEntry>();

function decodeUtf8(bytes: Uint8Array): { ok: true; text: string } | { ok: false } {
  if (!decoder) {
    return { ok: false };
  }
  try {
    return { ok: true, text: decoder.decode(bytes) };
  } catch {
    return { ok: false };
  }
}

export function loadPluginExports(
  snapshot: DatasetSnapshot,
  manifest: UiPluginManifest
): { exports: PluginExport | null; warnings: string[] } {
  const cacheKey = manifest.id;
  const cached = runtimeCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const warnings: string[] = [];
  const mainPath = manifest.main ?? "plugin.js";
  const filePath = `plugins/${manifest.id}/${mainPath}`;
  const bytes = snapshot.files.get(filePath);
  if (!bytes) {
    warnings.push(`Plugin ${manifest.id} is missing main file ${mainPath}.`);
    const entry = { exports: null, warnings };
    runtimeCache.set(cacheKey, entry);
    return entry;
  }
  const decoded = decodeUtf8(bytes);
  if (!decoded.ok) {
    warnings.push(`Plugin ${manifest.id} main file ${mainPath} is not valid UTF-8.`);
    const entry = { exports: null, warnings };
    runtimeCache.set(cacheKey, entry);
    return entry;
  }

  try {
    const factory = new Function("api", decoded.text) as (api: unknown) => unknown;
    const api = { React, h: React.createElement, Fragment: React.Fragment };
    const result = factory(api);
    if (!result || typeof result !== "object") {
      warnings.push(`Plugin ${manifest.id} main file ${mainPath} did not return exports.`);
      const entry = { exports: null, warnings };
      runtimeCache.set(cacheKey, entry);
      return entry;
    }
    const entry = { exports: result as PluginExport, warnings };
    runtimeCache.set(cacheKey, entry);
    return entry;
  } catch (err) {
    warnings.push(
      `Plugin ${manifest.id} main file ${mainPath} failed to evaluate: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    const entry = { exports: null, warnings };
    runtimeCache.set(cacheKey, entry);
    return entry;
  }
}

export function invokeFieldView(
  snapshot: DatasetSnapshot,
  manifest: UiPluginManifest,
  provider: ProviderRef,
  ctx: unknown
): { node: React.ReactNode | null; warnings: string[] } {
  const { exports, warnings } = loadPluginExports(snapshot, manifest);
  if (!exports) {
    return { node: null, warnings };
  }
  const entry = exports[provider.entry];
  if (typeof entry !== "function") {
    return {
      node: null,
      warnings: [...warnings, `Plugin ${provider.pluginId} is missing export ${provider.entry}.`]
    };
  }
  try {
    return { node: (entry as (input: unknown) => React.ReactNode)(ctx), warnings };
  } catch (err) {
    return {
      node: null,
      warnings: [
        ...warnings,
        `Plugin ${provider.pluginId} export ${provider.entry} threw an error: ${
          err instanceof Error ? err.message : String(err)
        }`
      ]
    };
  }
}
