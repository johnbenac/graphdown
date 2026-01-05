import { act, render, screen, waitFor } from "@testing-library/react";
import { strToU8, zipSync } from "fflate";
import { useEffect, useRef } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DatasetRoute from "./DatasetRoute";
import { DatasetProvider, useDataset } from "../state/DatasetContext";
import { MemoryStore } from "../storage/MemoryStore";

let store: MemoryStore;

vi.mock("../storage/createPersistStore", () => ({
  createPersistStore: () => store
}));

function buildZip(includeUiConfig: boolean, selectedPlugin = "boolean-redgreen") {
  const files: Record<string, Uint8Array> = {
    "types/flag.md": new Uint8Array(
      strToU8(
      ["---", "typeId: flag", "fields:", "  fieldDefs:", "    value:", "      required: true", "      kind: boolean", "---"].join(
        "\n"
      )
      )
    ),
    "records/flag/demo.md": new Uint8Array(
      strToU8(
        ["---", "typeId: flag", "recordId: demo", "fields:", "  value: true", "---", "Demo boolean record."].join("\n")
      )
    ),
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
    "plugins/boolean-redgreen/plugin.js": new Uint8Array(
      strToU8('return { renderField(ctx) { return ctx.value === true ? "🟢 true" : "🔴 false"; } };')
    ),
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
    "plugins/boolean-01/plugin.js": new Uint8Array(
      strToU8('return { renderField(ctx) { return ctx.value === true ? "1" : "0"; } };')
    )
  };

  if (includeUiConfig) {
    files["graphdown.ui.json"] = new Uint8Array(
      strToU8(
      JSON.stringify(
        {
          schemaVersion: 1,
          resolutions: [
            {
              capability: "field.view",
              match: { kind: "boolean" },
              use: selectedPlugin
            }
          ]
        },
        null,
        2
      )
      )
    );
  }

  const zipBytes = zipSync(files);
  return {
    name: "demo.zip",
    arrayBuffer: async () => Uint8Array.from(zipBytes).buffer
  } as File;
}

function Harness({ onReady }: { onReady: (ctx: ReturnType<typeof useDataset>) => void }) {
  const ctx = useDataset();

  useEffect(() => {
    onReady(ctx);
  }, [ctx, onReady]);

  return null;
}

describe("DatasetRoute UI plugins", () => {
  beforeEach(() => {
    store = new MemoryStore();
  });

  it("renders plugin output for resolved field views", async () => {
    const file = buildZip(true, "boolean-redgreen");
    let ctx: ReturnType<typeof useDataset> | null = null;

    render(
      <DatasetProvider>
        <MemoryRouter initialEntries={["/datasets/flag"]}>
          <Routes>
            <Route path="/datasets" element={<DatasetRoute />} />
            <Route path="/datasets/:recordTypeId" element={<DatasetRoute />} />
          </Routes>
        </MemoryRouter>
        <Harness onReady={(value) => (ctx = value)} />
      </DatasetProvider>
    );

    await waitFor(() => expect(ctx).not.toBeNull());
    await act(async () => {
      await ctx?.importDatasetZip(file);
    });
    await waitFor(() => {
      expect(ctx?.activeDataset?.parsedGraph?.typesById.size ?? 0).toBeGreaterThan(0);
    });

    expect(await screen.findByTestId("rendered-field-value")).toHaveTextContent("🟢 true");
  });

  it("records plugin ambiguity warnings when no resolution is provided", async () => {
    const file = buildZip(false);
    let ctx: ReturnType<typeof useDataset> | null = null;

    render(
      <DatasetProvider>
        <Harness onReady={(value) => (ctx = value)} />
      </DatasetProvider>
    );

    await waitFor(() => expect(ctx).not.toBeNull());
    await act(async () => {
      await ctx?.importDatasetZip(file);
    });
    await waitFor(() => {
      expect(ctx?.activeDataset?.parsedGraph?.typesById.size ?? 0).toBeGreaterThan(0);
    });

    await waitFor(() => {
      expect(ctx?.activeDataset?.meta.importReport?.pluginWarningCount ?? 0).toBeGreaterThan(0);
    });
  });
});
