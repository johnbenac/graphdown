import { describe, expect, it } from "vitest";

import { validateDatasetSnapshot } from "../index.js";
import { loadFixtureSnapshot } from "./fixtureLoader.js";

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
    const snapshot = loadFixtureSnapshot("graph-dataset");
    expect(snapshot.files.size).toBeGreaterThan(0);
  });
});
