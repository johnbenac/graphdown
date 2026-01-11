import assert from "node:assert/strict";
import { test } from "vitest";

import { validateDatasetSnapshot } from "..";
import { loadFixtureSnapshot } from "./fixtureLoader";

test("loads valid-dataset and validates OK", () => {
  const snapshot = loadFixtureSnapshot("valid-dataset");
  const result = validateDatasetSnapshot(snapshot);
  assert.equal(result.ok, true);
});

test("loads plugin-valid-dataset and validates OK (plugins ignored for now)", () => {
  const snapshot = loadFixtureSnapshot("plugin-valid-dataset");
  const result = validateDatasetSnapshot(snapshot);
  assert.equal(result.ok, true);
});

test("loads graph-dataset without throwing", () => {
  const snapshot = loadFixtureSnapshot("graph-dataset");
  assert.doesNotThrow(() => validateDatasetSnapshot(snapshot));
});
