import assert from "node:assert/strict";
import { test } from "vitest";

import { collectStringValues } from "../collectStringValues.js";

test("collectStringValues collects nested strings from objects + arrays", () => {
  const into = new Set<string>();
  collectStringValues(
    { a: "x", b: ["y", 123, { c: "z" }], d: null, e: true },
    into
  );
  assert.deepEqual([...into].sort(), ["x", "y", "z"]);
});

test("collectStringValues ignores non-strings safely", () => {
  const into = new Set<string>();
  collectStringValues(123, into);
  collectStringValues(null, into);
  collectStringValues(undefined, into);
  assert.deepEqual([...into], []);
});
