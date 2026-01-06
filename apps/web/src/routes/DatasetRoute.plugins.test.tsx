import { act, render, screen, waitFor } from "@testing-library/react";
import { strToU8, zipSync } from "fflate";
import { useEffect } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { readZipSnapshot } from "../import/readZipSnapshot";
import { DatasetProvider, useDataset } from "../state/DatasetContext";
import DatasetRoute from "./DatasetRoute";

function TestHarness({ onReady }: { onReady: (ctx: ReturnType<typeof useDataset>) => void }) {
  const ctx = useDataset();
  useEffect(() => {
    onReady(ctx);
  }, [ctx, onReady]);
  return null;
}

function buildDatasetZip({ includeConfig, configPlugin }: { includeConfig: boolean; configPlugin: string }) {
  const typeContent = [
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
  ].join("\n");

  const recordContent = [
    "---",
    "typeId: flag",
    "recordId: demo",
    "fields:",
    "  value: true",
    "---",
    "Demo boolean record."
  ].join("\n");

  const redGreenPlugin = [
    "return {",
    "  renderField(ctx) {",
    "    return ctx.value === true ? \"🟢 true\" : \"🔴 false\";",
    "  }",
    "};"
  ].join("\n");

  const boolean01Plugin = [
    "return {",
    "  renderField(ctx) {",
    "    return ctx.value === true ? \"1\" : \"0\";",
    "  }",
    "};"
  ].join("\n");

  const graphdownUi = JSON.stringify(
    {
      schemaVersion: 1,
      resolutions: [
        {
          capability: "field.view",
          match: { kind: "boolean" },
          use: configPlugin
        }
      ]
    },
    null,
    2
  );

  const files: Record<string, Uint8Array> = {
    "types/flag.md": new Uint8Array(strToU8(typeContent)),
    "records/flag/demo.md": new Uint8Array(strToU8(recordContent)),
    "plugins/boolean-redgreen/plugin.json": new Uint8Array(
      strToU8(
      JSON.stringify(
        {
          schemaVersion: 1,
          id: "boolean-redgreen",
          version: "1.0.0",
          main: "plugin.js",
          provides: [
            {
              capability: "field.view",
              match: { kind: "boolean" },
              entry: "renderField"
            }
          ]
        },
        null,
        2
      )
      )
    ),
    "plugins/boolean-redgreen/plugin.js": new Uint8Array(strToU8(redGreenPlugin)),
    "plugins/boolean-01/plugin.json": new Uint8Array(
      strToU8(
      JSON.stringify(
        {
          schemaVersion: 1,
          id: "boolean-01",
          version: "1.0.0",
          main: "plugin.js",
          provides: [
            {
              capability: "field.view",
              match: { kind: "boolean" },
              entry: "renderField"
            }
          ]
        },
        null,
        2
      )
      )
    ),
    "plugins/boolean-01/plugin.js": new Uint8Array(strToU8(boolean01Plugin))
  };

  if (includeConfig) {
    files["graphdown.ui.json"] = new Uint8Array(strToU8(graphdownUi));
  }

  return zipSync(files);
}

function renderDatasetRoute(path = "/datasets/flag") {
  let ctx: ReturnType<typeof useDataset> | null = null;
  render(
    <DatasetProvider>
      <TestHarness onReady={(value) => (ctx = value)} />
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/datasets" element={<DatasetRoute />} />
          <Route path="/datasets/:recordTypeId" element={<DatasetRoute />} />
        </Routes>
      </MemoryRouter>
    </DatasetProvider>
  );
  return () => ctx;
}

describe("DatasetRoute plugin rendering", () => {
  it("renders plugin output selected by graphdown.ui.json", async () => {
    const getCtx = renderDatasetRoute();
    const zipBytes = buildDatasetZip({ includeConfig: true, configPlugin: "boolean-redgreen" });
    const file = {
      name: "demo.zip",
      arrayBuffer: async () => Uint8Array.from(zipBytes).buffer
    } as File;

    const snapshotCheck = await readZipSnapshot(file);
    expect(snapshotCheck.snapshot.files.has("types/flag.md")).toBe(true);

    await act(async () => {
      await getCtx()?.importDatasetZip(file);
    });

    await waitFor(() => {
      expect(getCtx()?.activeDataset?.datasetSnapshot.files.has("types/flag.md")).toBe(true);
    });

    await waitFor(() => {
      expect(getCtx()?.activeDataset?.parsedGraph?.typesById.size).toBe(1);
    });

    await waitFor(() => {
      expect(screen.getByTestId("rendered-field-value")).toHaveTextContent("🟢 true");
    });
  });

  it("reports plugin ambiguity warnings when no config is present", async () => {
    const getCtx = renderDatasetRoute();
    const zipBytes = buildDatasetZip({ includeConfig: false, configPlugin: "boolean-redgreen" });
    const file = {
      name: "demo.zip",
      arrayBuffer: async () => Uint8Array.from(zipBytes).buffer
    } as File;

    const snapshotCheck = await readZipSnapshot(file);
    expect(snapshotCheck.snapshot.files.has("types/flag.md")).toBe(true);

    await act(async () => {
      await getCtx()?.importDatasetZip(file);
    });

    await waitFor(() => {
      expect(getCtx()?.activeDataset?.datasetSnapshot.files.has("types/flag.md")).toBe(true);
    });

    await waitFor(() => {
      expect(getCtx()?.activeDataset?.parsedGraph?.typesById.size).toBe(1);
    });

    await waitFor(() => {
      const report = getCtx()?.activeDataset?.meta.importReport;
      expect(report?.pluginWarningCount).toBeGreaterThan(0);
    });
  });
});
