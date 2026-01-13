import assert from "node:assert/strict";
import { test } from "vitest";

import { isValidPluginId } from "..";

test("PLUG-ID-001: pluginId matches separator-safe identifier syntax", () => {
  assert.equal(isValidPluginId("demo"), true);
  assert.equal(isValidPluginId("a"), true);
  assert.equal(isValidPluginId("A1"), true);
  assert.equal(isValidPluginId("a_b"), true);
  assert.equal(isValidPluginId("a-b"), true);
  assert.equal(isValidPluginId("0abc"), true);

  assert.equal(isValidPluginId(""), false);
  assert.equal(isValidPluginId("   "), false);
  assert.equal(isValidPluginId(" demo"), false);
  assert.equal(isValidPluginId("demo "), false);
  assert.equal(isValidPluginId("-bad"), false);
  assert.equal(isValidPluginId("_bad"), false);
  assert.equal(isValidPluginId("a.b"), false);
  assert.equal(isValidPluginId("a:b"), false);
  assert.equal(isValidPluginId("a/b"), false);
});
