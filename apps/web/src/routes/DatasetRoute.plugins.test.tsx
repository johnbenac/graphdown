import { render, screen } from "@testing-library/react";
import { strToU8, zipSync } from "fflate";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { canonicalizeDatasetSnapshot } from "../core/canonicalizeDatasetSnapshot";
import { buildGraphFromSnapshot } from "../core/graph";
import { readZipSnapshot } from "../import/readZipSnapshot";
import type { LoadedDataset } from "../persistence/types";
import { createUiPluginHost } from "../uiPlugins/host";
import DatasetRoute from "./DatasetRoute";

let mockDataset: LoadedDataset | undefined;
let mockUiPlugins: ReturnType<typeof createUiPluginHost> | null = null;

vi.mock("../state/DatasetContext", () => ({
  useDataset: () => ({
    status: mockDataset ? "ready" : "idle",
    progress: { phase: "done" as const },
    activeDataset: mockDataset,
    uiPlugins: mockUiPlugins,
    error: undefined,
    importDatasetZip: vi.fn(),
    importDatasetFromGitHub: vi.fn(),
    clearPersistence: vi.fn(),
    updateRecord: vi.fn(),
    createRecord: vi.fn()
  })
}));

beforeEach(() => {
  mockDataset = undefined;
  mockUiPlugins = null;
});

function buildZip({ includeConfig }: { includeConfig: boolean }) {
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

  const redGreenManifest = JSON.stringify({
    id: "boolean-redgreen",
    version: "1.0.0",
    entry: "plugin.js",
    providers: [
      {
        id: "default",
        capability: "field.view",
        match: { kind: "boolean" },
        title: "Red/Green boolean"
      }
    ]
  });

  const redGreenCode = [
    "export default {",
    "  default({ container, ctx }) {",
    "    container.textContent = ctx.value === true ? \"🟢 true\" : \"🔴 false\";",
    "  }",
    "};"
  ].join("\n");

  const booleanManifest = JSON.stringify({
    id: "boolean-01",
    version: "1.0.0",
    entry: "plugin.js",
    providers: [
      {
        id: "default",
        capability: "field.view",
        match: { kind: "boolean" },
        title: "0/1 boolean"
      }
    ]
  });

  const booleanCode = [
    "export default {",
    "  default({ container, ctx }) {",
    "    container.textContent = ctx.value === true ? \"1\" : \"0\";",
    "  }",
    "};"
  ].join("\n");

  const recordViewManifest = JSON.stringify({
    id: "record-viewer",
    entry: "plugin.js",
    providers: [
      {
        id: "default",
        capability: "record.view",
        match: { typeId: "flag" },
        title: "Default view"
      }
    ]
  });

  const recordViewCode = [
    "export default {",
    "  default({ container, ctx }) {",
    "    container.textContent = `VIEW:${ctx.recordId}`;",
    "  }",
    "};"
  ].join("\n");

  const toBytes = (value: string) => new Uint8Array(strToU8(value));
  const files: Record<string, Uint8Array> = {
    "types/flag.md": toBytes(typeContent),
    "records/flag/demo.md": toBytes(recordContent),
    "ui/renderers/boolean-redgreen/plugin.json": toBytes(redGreenManifest),
    "ui/renderers/boolean-redgreen/plugin.js": toBytes(redGreenCode),
    "ui/renderers/boolean-01/plugin.json": toBytes(booleanManifest),
    "ui/renderers/boolean-01/plugin.js": toBytes(booleanCode),
    "ui/views/flag/manifest.json": toBytes(recordViewManifest),
    "ui/views/flag/plugin.js": toBytes(recordViewCode)
  };

  if (includeConfig) {
    const config = JSON.stringify({
      resolutions: [
        {
          capability: "field.view",
          match: { kind: "boolean" },
          use: "boolean-01"
        }
      ]
    });
    files["ui/config/graphdown.ui.json"] = toBytes(config);
  }

  return zipSync(files);
}

async function buildDataset(includeConfig: boolean) {
  const zipBytes = buildZip({ includeConfig });
  const file = {
    name: "demo.zip",
    arrayBuffer: async () => Uint8Array.from(zipBytes).buffer
  } as File;
  const { snapshot } = await readZipSnapshot(file);
  const canonicalSnapshot = canonicalizeDatasetSnapshot(snapshot);
  const graphResult = buildGraphFromSnapshot(canonicalSnapshot);
  if (!graphResult.ok) {
    throw new Error("Graph build failed in test setup");
  }
  const now = Date.now();
  const meta = {
    id: "active",
    createdAt: now,
    updatedAt: now,
    snapshotFormatVersion: 1,
    graphFormatVersion: 1,
    uiStateFormatVersion: 1,
    label: "demo.zip",
    source: "import",
    importReport: {
      ignoredFileCount: 0,
      ignoredFileSample: [],
      droppedBlobCount: 0,
      droppedBlobSample: [],
      pluginWarningCount: includeConfig ? 0 : 1,
      pluginWarningSample: includeConfig ? [] : ["Ambiguous field.view provider"]
    }
  };
  mockDataset = { meta, datasetSnapshot: canonicalSnapshot, parsedGraph: graphResult.graph };
  mockUiPlugins = createUiPluginHost(canonicalSnapshot, graphResult.graph);

  expect(canonicalSnapshot.files.has("plugins/boolean-01/plugin.json")).toBe(true);
  expect(canonicalSnapshot.files.has("plugins/boolean-01/plugin.js")).toBe(true);
  expect(canonicalSnapshot.files.has("plugins/boolean-redgreen/plugin.json")).toBe(true);
  expect(canonicalSnapshot.files.has("plugins/record-viewer/manifest.json")).toBe(true);
  expect(canonicalSnapshot.files.has("plugins/record-viewer/plugin.js")).toBe(true);
  expect(canonicalSnapshot.files.has("graphdown.ui.json")).toBe(includeConfig);
  expect(canonicalSnapshot.files.has("ui/renderers/boolean-01/plugin.json")).toBe(false);
  expect(canonicalSnapshot.files.has("ui/config/graphdown.ui.json")).toBe(false);
}

function renderRoute() {
  render(
    <MemoryRouter initialEntries={["/datasets/flag"]}>
      <Routes>
        <Route path="/datasets/:recordTypeId" element={<DatasetRoute />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("DatasetRoute UI plugins", () => {
  it("UI-PLUGIN-001: renders dataset-embedded plugins from imported snapshots", async () => {
    await buildDataset(true);
    renderRoute();
    const rendered = await screen.findByTestId("rendered-field-value", {}, { timeout: 3000 });
    expect(rendered).toHaveTextContent("1");
    const recordView = await screen.findByTestId("record-view-output", {}, { timeout: 3000 });
    expect(recordView).toHaveTextContent("VIEW:demo");
  });

  it("UI-PLUGIN-003: reports ambiguity warnings when no resolution is provided", async () => {
    await buildDataset(false);
    renderRoute();
    const warningBanner = await screen.findByTestId("import-warning", {}, { timeout: 3000 });
    expect(warningBanner).toHaveTextContent("plugin warning");
  });
});
