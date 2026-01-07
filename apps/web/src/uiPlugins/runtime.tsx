import React, { useEffect, useRef, useState } from "react";
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
  return `${manifest.id}:${manifest.entry}`;
}

function isPromiseLike(value: unknown): value is Promise<unknown> {
  return Boolean(value) && typeof (value as PromiseLike<unknown>).then === "function";
}

function toDataUrl(code: string): string {
  if (typeof btoa === "function") {
    return `data:text/javascript;base64,${btoa(code)}`;
  }
  if (typeof Buffer !== "undefined") {
    return `data:text/javascript;base64,${Buffer.from(code, "utf8").toString("base64")}`;
  }
  // Fallback: best-effort plain data URI
  return `data:text/javascript,${encodeURIComponent(code)}`;
}

async function importModuleFromCode(code: string): Promise<unknown> {
  let url: string | null = null;
  try {
    if (typeof Blob !== "undefined" && typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
      const blob = new Blob([code], { type: "text/javascript" });
      url = URL.createObjectURL(blob);
    } else {
      url = toDataUrl(code);
    }
    const imported = await import(/* @vite-ignore */ url);
    return imported?.default;
  } finally {
    if (url && url.startsWith("blob:") && typeof URL !== "undefined") {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore revoke failures
      }
    }
  }
}

export async function loadPluginModule(input: {
  snapshot: DatasetSnapshot;
  manifest: UiPluginManifest;
  cache: Map<string, Promise<Record<string, unknown>> | null>;
  onWarning?: (warning: UiPluginWarning) => void;
}): Promise<Record<string, unknown>> {
  const { snapshot, manifest, cache, onWarning } = input;
  const cacheKey = getCacheKey(manifest);
  const cached = cache.get(cacheKey);
  if (cached === null) {
    return {};
  }
  if (cached !== undefined) {
    return cached;
  }

  const filePath = `plugins/${manifest.id}/${manifest.entry}`;
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

  const modulePromise = importModuleFromCode(code)
    .then((defaultExport) => {
      if (!defaultExport || typeof defaultExport !== "object") {
        onWarning?.({
          message: `Plugin "${manifest.id}" did not return an exports object`,
          pluginId: manifest.id
        });
        return {};
      }
      return defaultExport as Record<string, unknown>;
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      onWarning?.({ message: `Plugin "${manifest.id}" failed to load: ${message}`, pluginId: manifest.id });
      return {};
    });
  cache.set(cacheKey, modulePromise);
  return modulePromise;
}

type UiPluginSlotProps<TCtx> = {
  snapshot: DatasetSnapshot;
  manifest: UiPluginManifest;
  provider: ProviderRef;
  ctx: TCtx;
  cache: Map<string, Promise<Record<string, unknown>> | null>;
  onWarning?: (warning: UiPluginWarning) => void;
  fallback?: React.ReactNode;
};

function UiPluginSlot<TCtx>({
  snapshot,
  manifest,
  provider,
  ctx,
  cache,
  onWarning,
  fallback
}: UiPluginSlotProps<TCtx>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    setFailed(false);
    container.textContent = "";
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    let cancelled = false;
    const warn = (message: string) => onWarning?.({ message, pluginId: provider.pluginId });

    const applyCleanup = (cleanup: unknown) => {
      if (typeof cleanup === "function") {
        if (cancelled) {
          cleanup();
        } else {
          cleanupRef.current = cleanup;
        }
      }
    };

    loadPluginModule({ snapshot, manifest, cache, onWarning })
      .then((exportsValue) => {
        if (cancelled) return;
        const renderer = (exportsValue as Record<string, unknown>)[provider.providerId];
        if (typeof renderer !== "function") {
          setFailed(true);
          warn(`Plugin "${provider.pluginId}" missing provider "${provider.providerId}"`);
          return;
        }
        try {
          const result = (renderer as (args: { container: HTMLElement; ctx: unknown }) => unknown)({
            container,
            ctx
          });
          if (isPromiseLike(result)) {
            result
              .then((cleanup) => {
                if (cancelled) {
                  if (typeof cleanup === "function") cleanup();
                  return;
                }
                applyCleanup(cleanup);
              })
              .catch((error) => {
                const message = error instanceof Error ? error.message : String(error);
                warn(`Plugin "${provider.pluginId}" renderer threw: ${message}`);
                setFailed(true);
              });
            return;
          }
          applyCleanup(result);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          warn(`Plugin "${provider.pluginId}" renderer threw: ${message}`);
          setFailed(true);
        }
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        warn(`Plugin "${provider.pluginId}" failed to load: ${message}`);
        setFailed(true);
      });

    return () => {
      cancelled = true;
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      container.textContent = "";
    };
  }, [snapshot, manifest, provider, ctx, cache, onWarning]);

  return (
    <div data-ui-plugin-slot>
      <div ref={containerRef} />
      {failed && fallback ? <div className="ui-plugin-fallback">{fallback}</div> : null}
    </div>
  );
}

function renderFieldFallback(value: unknown): React.ReactNode {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean" || value === null) {
    return String(value);
  }
  return <pre>{JSON.stringify(value, null, 2)}</pre>;
}

export function renderFieldProvider(input: {
  snapshot: DatasetSnapshot;
  manifest: UiPluginManifest;
  provider: ProviderRef;
  ctx: FieldViewContext;
  cache: Map<string, Promise<Record<string, unknown>> | null>;
  onWarning?: (warning: UiPluginWarning) => void;
}): React.ReactNode {
  const { snapshot, manifest, provider, ctx, cache, onWarning } = input;
  return (
    <UiPluginSlot
      snapshot={snapshot}
      manifest={manifest}
      provider={provider}
      ctx={ctx}
      cache={cache}
      onWarning={onWarning}
      fallback={renderFieldFallback(ctx.value)}
    />
  );
}

export function renderRecordProvider(input: {
  snapshot: DatasetSnapshot;
  manifest: UiPluginManifest;
  provider: ProviderRef;
  ctx: RecordViewContext;
  cache: Map<string, Promise<Record<string, unknown>> | null>;
  onWarning?: (warning: UiPluginWarning) => void;
}): React.ReactNode {
  const { snapshot, manifest, provider, ctx, cache, onWarning } = input;
  return (
    <UiPluginSlot
      snapshot={snapshot}
      manifest={manifest}
      provider={provider}
      ctx={ctx}
      cache={cache}
      onWarning={onWarning}
      fallback={<em>(plugin error)</em>}
    />
  );
}
