import React from "react";
import { render, waitFor, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { DatasetSnapshot } from "../core/snapshotTypes";
import type { FieldViewContext, ProviderRef, RecordViewContext, UiPluginManifest } from "./types";
import { renderFieldProvider, renderRecordProvider } from "./runtime";

const encoder = new TextEncoder();

const fieldCtx: FieldViewContext = {
  typeId: "note",
  recordId: "one",
  recordKey: "note:one",
  fieldName: "value",
  kind: "boolean",
  value: true,
  recordFields: {},
  typeFields: {}
};

const recordCtx: RecordViewContext = {
  typeId: "note",
  recordId: "one",
  recordKey: "note:one",
  recordFields: {},
  recordBody: "",
  typeFields: {},
  outgoingLinks: [],
  incomingLinks: [],
  graph: null
};

function makeSnapshot(pluginCode: string): DatasetSnapshot {
  const manifest: UiPluginManifest = {
    id: "demo-plugin",
    version: "1.0.0",
    entry: "plugin.js",
    providers: [
      { id: "default", capability: "field.view", match: { kind: "boolean" } },
      { id: "record-view", capability: "record.view", match: { typeId: "note" } },
      { id: "alt", capability: "record.view", match: { typeId: "note", recordId: "one" } }
    ]
  };

  const files = new Map<string, Uint8Array>([
    ["plugins/demo-plugin/plugin.json", encoder.encode(JSON.stringify(manifest))],
    ["plugins/demo-plugin/plugin.js", encoder.encode(pluginCode)]
  ]);
  return { files };
}

function makeProviderRef(id: string, capability: string, match: Record<string, string> = {}): ProviderRef {
  return {
    pluginId: "demo-plugin",
    version: "1.0.0",
    entry: "plugin.js",
    capability,
    match,
    providerId: id,
    title: undefined,
    providerIndex: 0
  };
}

afterEach(() => cleanup());

describe("uiPlugins runtime lifecycle", () => {
  beforeEach(() => {
    (globalThis as unknown as { __cleanupEvents?: string[] }).__cleanupEvents = [];
    (globalThis as unknown as { __cleanupCount?: number }).__cleanupCount = 0;
  });

  it("calls cleanup on unmount for record views", async () => {
    const pluginCode = `
let count = 0;
export default {
  "record-view"({ container }) {
    container.textContent = "record-view";
    return () => {
      count += 1;
      globalThis.__cleanupCount = count;
    };
  }
};`;
    const snapshot = makeSnapshot(pluginCode);
    const manifest: UiPluginManifest = {
      id: "demo-plugin",
      version: "1.0.0",
      entry: "plugin.js",
      providers: [
        { id: "default", capability: "field.view", match: { kind: "boolean" } },
        { id: "record-view", capability: "record.view", match: { typeId: "note" } },
        { id: "alt", capability: "record.view", match: { typeId: "note", recordId: "one" } }
      ]
    };
    const provider = makeProviderRef("record-view", "record.view", { typeId: "note" });
    const cache = new Map<string, Promise<Record<string, unknown>> | null>();

    const view = renderRecordProvider({
      snapshot,
      manifest,
      provider,
      ctx: recordCtx,
      cache
    });

    const { unmount, container } = render(<>{view}</>);
    await waitFor(() => expect(container.textContent).toContain("record-view"));

    unmount();
    expect((globalThis as unknown as { __cleanupCount?: number }).__cleanupCount).toBe(1);
  });

  it("calls cleanup when switching providers", async () => {
    const pluginCode = `
globalThis.__cleanupEvents = [];
export default {
  "record-view"({ container }) {
    container.textContent = "A";
    return () => {
      globalThis.__cleanupEvents.push("A");
    };
  },
  alt({ container }) {
    container.textContent = "B";
    return () => {
      globalThis.__cleanupEvents.push("B");
    };
  }
};`;
    const snapshot = makeSnapshot(pluginCode);
    const manifest: UiPluginManifest = {
      id: "demo-plugin",
      version: "1.0.0",
      entry: "plugin.js",
      providers: [
        { id: "default", capability: "field.view", match: { kind: "boolean" } },
        { id: "record-view", capability: "record.view", match: { typeId: "note" } },
        { id: "alt", capability: "record.view", match: { typeId: "note", recordId: "one" } }
      ]
    };
    const providerA = makeProviderRef("record-view", "record.view", { typeId: "note" });
    const providerB = makeProviderRef("alt", "record.view", { typeId: "note", recordId: "one" });
    const cache = new Map<string, Promise<Record<string, unknown>> | null>();

    const { rerender, container, unmount } = render(
      <>
        {renderRecordProvider({
          snapshot,
          manifest,
          provider: providerA,
          ctx: recordCtx,
          cache
        })}
      </>
    );

    await waitFor(() => expect(container.textContent).toContain("A"));

    rerender(
      <>
        {renderRecordProvider({
          snapshot,
          manifest,
          provider: providerB,
          ctx: recordCtx,
          cache
        })}
      </>
    );

    await waitFor(() => expect(container.textContent).toContain("B"));

    expect((globalThis as unknown as { __cleanupEvents?: string[] }).__cleanupEvents).toContain("A");

    unmount();
    expect((globalThis as unknown as { __cleanupEvents?: string[] }).__cleanupEvents).toContain("B");
  });

  it("renders field providers with container-based renderers", async () => {
    const pluginCode = `
export default {
  default({ container, ctx }) {
    container.textContent = ctx.value === true ? "field-true" : "field-false";
  }
};`;
    const snapshot = makeSnapshot(pluginCode);
    const manifest: UiPluginManifest = {
      id: "demo-plugin",
      version: "1.0.0",
      entry: "plugin.js",
      providers: [
        { id: "default", capability: "field.view", match: { kind: "boolean" } },
        { id: "record-view", capability: "record.view", match: { typeId: "note" } },
        { id: "alt", capability: "record.view", match: { typeId: "note", recordId: "one" } }
      ]
    };
    const provider = makeProviderRef("default", "field.view", { kind: "boolean" });
    const cache = new Map<string, Promise<Record<string, unknown>> | null>();

    const view = renderFieldProvider({
      snapshot,
      manifest,
      provider,
      ctx: fieldCtx,
      cache
    });

    const { container } = render(<>{view}</>);
    await waitFor(() => expect(container.textContent).toContain("field-true"));
  });
});
