import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { appRoutes } from "./App";
import DatasetProvider from "./state/DatasetProvider";

const renderWithProviders = (router: ReturnType<typeof createMemoryRouter>) => {
  render(
    <DatasetProvider forceMemory>
      <RouterProvider router={router} />
    </DatasetProvider>,
  );
};

describe("App routes", () => {
  it("renders navigation links", async () => {
    const router = createMemoryRouter(appRoutes, { initialEntries: ["/import"] });
    renderWithProviders(router);

    expect(await screen.findByTestId("topnav")).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "Import" })).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "Datasets" })).toBeInTheDocument();
  });

  it("renders the import route", async () => {
    const router = createMemoryRouter(appRoutes, { initialEntries: ["/import"] });
    renderWithProviders(router);

    expect(await screen.findByTestId("import-screen")).toBeInTheDocument();
    expect(await screen.findByText("Upload a dataset zip to browse.")).toBeInTheDocument();
  });

  it("renders the datasets route", async () => {
    const router = createMemoryRouter(appRoutes, { initialEntries: ["/datasets"] });
    renderWithProviders(router);

    expect(await screen.findByTestId("dataset-screen")).toBeInTheDocument();
    expect(await screen.findByText("Import a dataset to begin")).toBeInTheDocument();
  });
});
