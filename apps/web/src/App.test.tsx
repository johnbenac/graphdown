import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";

describe("App routes", () => {
  it("renders top navigation", () => {
    render(
      <MemoryRouter initialEntries={["/import"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByTestId("topnav")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /import/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /datasets/i })).toBeInTheDocument();
  });

  it("shows import screen content", () => {
    render(
      <MemoryRouter initialEntries={["/import"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByTestId("import-screen")).toBeInTheDocument();
    expect(screen.getByText(/upload a dataset zip/i)).toBeInTheDocument();
  });

  it("shows dataset screen content", () => {
    render(
      <MemoryRouter initialEntries={["/datasets"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByTestId("dataset-screen")).toBeInTheDocument();
    expect(screen.getByText(/import a dataset to begin/i)).toBeInTheDocument();
  });
});
