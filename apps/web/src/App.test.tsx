import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { appRoutes } from "./App";

describe("App routes", () => {
  it("renders navigation links", () => {
    const router = createMemoryRouter(appRoutes, { initialEntries: ["/import"] });
    render(<RouterProvider router={router} />);

    expect(screen.getByTestId("topnav")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Import" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Datasets" })).toBeInTheDocument();
  });

  it("renders the import route", () => {
    const router = createMemoryRouter(appRoutes, { initialEntries: ["/import"] });
    render(<RouterProvider router={router} />);

    expect(screen.getByTestId("import-screen")).toBeInTheDocument();
    expect(screen.getByText("Upload a dataset zip to browse.")).toBeInTheDocument();
  });

  it("renders the datasets route", () => {
    const router = createMemoryRouter(appRoutes, { initialEntries: ["/datasets"] });
    render(<RouterProvider router={router} />);

    expect(screen.getByTestId("dataset-screen")).toBeInTheDocument();
    expect(screen.getByText("Import a dataset to begin")).toBeInTheDocument();
  });
});
