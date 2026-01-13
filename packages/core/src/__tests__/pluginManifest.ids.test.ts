import assert from "node:assert/strict";
import { test } from "vitest";

import { isValidPluginId } from "..";

test("PLUG-ID-001: pluginId matches separator-safe identifier syntax", () => {
  const valid = ["demo", "a", "A1", "a_b", "a-b", "0abc"];
  const invalid = ["", "   ", " demo", "demo ", "-bad", "_bad", "a.b", "a:b", "a/b"];

  for (const value of valid) {
    assert.equal(isValidPluginId(value), true, `${value} should be valid`);
  }

  for (const value of invalid) {
    assert.equal(isValidPluginId(value), false, `${value} should be invalid`);
  }
});
