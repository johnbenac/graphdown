import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { appRoutes } from "./App";
import { DatasetProvider } from "./state/DatasetContext";

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
  });

  it("renders the import route", async () => {
    const router = createMemoryRouter(appRoutes, { initialEntries: ["/import"] });
    render(
      <DatasetProvider>
        <RouterProvider router={router} />
      </DatasetProvider>
    );

    expect(await screen.findByTestId("import-screen")).toBeInTheDocument();
    expect(screen.getByText("Upload a dataset zip to browse.")).toBeInTheDocument();
  });

  it("renders the datasets route", async () => {
    const router = createMemoryRouter(appRoutes, { initialEntries: ["/datasets"] });
    render(
      <DatasetProvider>
        <RouterProvider router={router} />
      </DatasetProvider>
    );

    expect(await screen.findByTestId("dataset-screen")).toBeInTheDocument();
    expect(screen.getByText("Import a dataset to begin")).toBeInTheDocument();
  });
});
