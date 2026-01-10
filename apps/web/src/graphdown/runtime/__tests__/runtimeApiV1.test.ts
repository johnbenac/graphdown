import assert from "node:assert/strict";
import { test } from "vitest";

import { openRuntimeApiV1, RUNTIME_API_VERSION_V1 } from "../../index";
import { makeSnapshot } from "./fixtures";

test("RUNTIME-001: v1 module is exported from graphdown index", async () => {
  assert.equal(RUNTIME_API_VERSION_V1, 1);

  const promise = openRuntimeApiV1({ snapshot: makeSnapshot() });
  assert.equal(typeof (promise as Promise<unknown>).then, "function");

  const result = await promise;
  assert.equal(result.ok, true);
  if (!result.ok) {
    assert.fail("Expected ok result");
  }
  assert.equal(result.value.apiVersion, 1);
  assert.ok(result.value.capabilities.includes("gd.api.read"));
});
