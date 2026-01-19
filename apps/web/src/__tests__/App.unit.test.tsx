import "fake-indexeddb/auto";
import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { appRoutes } from "../App";
import { DatasetProvider } from "../state/DatasetContext";

vi.mock("@graphdown/persistence", async () => {
  const actual = await vi.importActual<typeof import("@graphdown/persistence")>("@graphdown/persistence");
  return {
    ...actual,
    createIndexedDbPersistStore: () => new actual.MemoryPersistStore()
  };
});

describe("App routes", () => {
  it("renders navigation links", async () => {
    const router = createMemoryRouter(appRoutes, { initialEntries: ["/import"] });
    render(
      <DatasetProvider>
        <RouterProvider router={router} />
      </DatasetProvider>
    );

    expect(await screen.findByTestId("topnav")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Import" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Datasets" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Export" })).toBeInTheDocument();
  });

  it("renders the import route", async () => {
    const router = createMemoryRouter(appRoutes, { initialEntries: ["/import"] });
    render(
      <DatasetProvider>
        <RouterProvider router={router} />
      </DatasetProvider>
    );

    expect(await screen.findByTestId("import-screen")).toBeInTheDocument();
    expect(screen.getByText("Paste a GitHub repository URL to import a dataset.")).toBeInTheDocument();
  });

  it("renders the datasets route", async () => {
    const router = createMemoryRouter(appRoutes, { initialEntries: ["/datasets"] });
    render(
      <DatasetProvider>
        <RouterProvider router={router} />
      </DatasetProvider>
    );

    expect(await screen.findByTestId("dataset-screen")).toBeInTheDocument();
    expect(await screen.findByText("Import a dataset to begin", {}, { timeout: 3000 })).toBeInTheDocument();
  });

  it("renders the export route", async () => {
    const router = createMemoryRouter(appRoutes, { initialEntries: ["/export"] });
    render(
      <DatasetProvider>
        <RouterProvider router={router} />
      </DatasetProvider>
    );

    expect(await screen.findByTestId("export-screen")).toBeInTheDocument();
    expect(await screen.findByText("Import a dataset to export", {}, { timeout: 3000 })).toBeInTheDocument();
  });
});
