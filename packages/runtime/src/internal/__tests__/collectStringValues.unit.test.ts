import assert from "node:assert/strict";
import { test } from "vitest";

import { collectStringValues } from "../collectStringValues";

test("collectStringValues collects nested strings", () => {
  const into = new Set<string>();
  collectStringValues({ a: "x", b: ["y", { c: "z" }] }, into);
  assert.deepEqual([...into].sort(), ["x", "y", "z"]);
});
