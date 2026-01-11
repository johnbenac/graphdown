import { describe, expect, it } from "vitest";

import { validateDatasetSnapshot } from "..";
import { loadFixtureSnapshot } from "./fixtureLoader";

describe("fixtureLoader", () => {
  it("loads valid-dataset and validates OK", () => {
    const snapshot = loadFixtureSnapshot("valid-dataset");
    const result = validateDatasetSnapshot(snapshot);

    expect(result.ok).toBe(true);
  });

  it("loads plugin-valid-dataset and validates OK (plugins ignored for now)", () => {
    const snapshot = loadFixtureSnapshot("plugin-valid-dataset");
    const result = validateDatasetSnapshot(snapshot);

    expect(result.ok).toBe(true);
  });

  it("loads graph-dataset without throwing", () => {
    expect(() => loadFixtureSnapshot("graph-dataset")).not.toThrow();
  });
});
