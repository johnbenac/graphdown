import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { strToU8, zipSync } from "fflate";
import { useEffect } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { isRecordFileBytes } from "../core/datasetObjects";
import { readZipSnapshot } from "../import/readZipSnapshot";
import { createUiPluginHost } from "../uiPlugins/host";
import { DatasetProvider, useDataset } from "./DatasetContext";

function TestHarness({ onReady }: { onReady: (ctx: ReturnType<typeof useDataset>) => void }) {
  const ctx = useDataset();
  useEffect(() => {
    onReady(ctx);
  }, [ctx, onReady]);
  return null;
}

function buildZip(usePluginId?: string) {
  const toBytes = (value: string) => new Uint8Array(strToU8(value));
  const files: Record<string, Uint8Array> = {
    "types/flag.md": toBytes(
      [
        "---",
        "typeId: flag",
        "fields:",
        "  displayName: Flag",
        "  pluralName: Flags",
        "  fieldDefs:",
        "    value:",
        "      required: true",
        "      kind: boolean",
        "---"
      ].join("\n")
    ),
    "records/flag/demo.md": toBytes(
      ["---", "typeId: flag", "recordId: demo", "fields:", "  value: true", "---", "Demo boolean record."].join(
        "\n"
      )
    ),
    "plugins/boolean-redgreen/plugin.json": toBytes(
      JSON.stringify({
        schemaVersion: 1,
        id: "boolean-redgreen",
        version: "1.0.0",
        main: "plugin.js",
        provides: [{ capability: "field.view", match: { kind: "boolean" }, entry: "renderField" }]
      })
    ),
    "plugins/boolean-redgreen/plugin.js": toBytes(
      ["return {", "  renderField(ctx) {", '    return ctx.value === true ? "🟢 true" : "🔴 false";', "  }", "};"].join(
        "\n"
      )
    ),
    "plugins/boolean-01/plugin.json": toBytes(
      JSON.stringify({
        schemaVersion: 1,
        id: "boolean-01",
        version: "1.0.0",
        main: "plugin.js",
        provides: [{ capability: "field.view", match: { kind: "boolean" }, entry: "renderField" }]
      })
    ),
    "plugins/boolean-01/plugin.js": toBytes(
      ["return {", "  renderField(ctx) {", '    return ctx.value === true ? "1" : "0";', "  }", "};"].join("\n")
    )
  };

  if (usePluginId) {
    files["graphdown.ui.json"] = toBytes(
      JSON.stringify({
        schemaVersion: 1,
        resolutions: [{ capability: "field.view", match: { kind: "boolean" }, use: usePluginId }]
      })
    );
  }

  return { zipBytes: zipSync(files), files };
}

function renderWithDataset() {
  let ctx: ReturnType<typeof useDataset> | null = null;
  render(
    <DatasetProvider>
      <MemoryRouter initialEntries={["/datasets"]}>
        <Routes>
          <Route path="/datasets" element={<div />} />
          <Route path="/datasets/:recordTypeId" element={<div />} />
        </Routes>
      </MemoryRouter>
      <TestHarness onReady={(value) => (ctx = value)} />
    </DatasetProvider>
  );
  return () => ctx;
}

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  cleanup();
});

describe("DatasetContext plugin rendering", () => {
  it("renders a field using the selected plugin resolution", async () => {
    const { zipBytes, files } = buildZip("boolean-01");
    const file = {
      name: "demo.zip",
      arrayBuffer: async () => Uint8Array.from(zipBytes).buffer
    } as File;

    expect(isRecordFileBytes("types/flag.md", files["types/flag.md"])).toBe(true);
    expect(isRecordFileBytes("records/flag/demo.md", files["records/flag/demo.md"])).toBe(true);

    const { snapshot } = await readZipSnapshot(file);
    expect(snapshot.files.has("types/flag.md")).toBe(true);
    expect(snapshot.files.has("records/flag/demo.md")).toBe(true);

    const getCtx = renderWithDataset();
    await waitFor(() => expect(getCtx()).not.toBeNull());
    await waitFor(() => expect(getCtx()?.status).toBe("ready"));
    await act(async () => {
      await getCtx()?.importDatasetZip(file);
    });

    await waitFor(() => expect(getCtx()?.activeDataset?.parsedGraph?.typesById.size).toBeGreaterThan(0));

    const importedDataset = getCtx()?.activeDataset;
    expect(importedDataset?.parsedGraph).toBeDefined();
    cleanup();
    vi.resetModules();
    vi.doMock("../state/DatasetContext", () => ({
      useDataset: () => ({
        status: "ready",
        progress: { phase: "done" },
        activeDataset: importedDataset,
        uiPlugins: importedDataset?.parsedGraph
          ? createUiPluginHost(importedDataset.datasetSnapshot, importedDataset.parsedGraph)
          : null,
        error: undefined,
        importDatasetZip: vi.fn(),
        importDatasetFromGitHub: vi.fn(),
        clearPersistence: vi.fn(),
        updateRecord: vi.fn(),
        createRecord: vi.fn()
      })
    }));
    const { default: DatasetRoute } = await import("../routes/DatasetRoute");
    render(
      <MemoryRouter initialEntries={["/datasets/flag"]}>
        <Routes>
          <Route path="/datasets" element={<DatasetRoute />} />
          <Route path="/datasets/:recordTypeId" element={<DatasetRoute />} />
        </Routes>
      </MemoryRouter>
    );
    const renderedField = await screen.findByTestId("rendered-field-value");
    expect(renderedField).toHaveTextContent("1");
  });

  it("reports plugin ambiguity warnings when no resolution is provided", async () => {
    const { zipBytes } = buildZip();
    const file = {
      name: "demo.zip",
      arrayBuffer: async () => Uint8Array.from(zipBytes).buffer
    } as File;

    const getCtx = renderWithDataset();
    await waitFor(() => expect(getCtx()).not.toBeNull());
    await waitFor(() => expect(getCtx()?.status).toBe("ready"));
    await act(async () => {
      await getCtx()?.importDatasetZip(file);
    });

    await waitFor(() => {
      const report = getCtx()?.activeDataset?.meta.importReport;
      expect(report?.pluginWarningCount).toBeGreaterThan(0);
    });
  });
});
