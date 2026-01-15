import assert from "node:assert/strict";
import { test } from "vitest";

import { decodeUtf8Strict, decodeUtf8StrictOrThrow, normalizeLineEndings } from "../text";

test("normalizeLineEndings normalizes CRLF and CR to LF", () => {
  assert.equal(normalizeLineEndings("a\r\nb\rc"), "a\nb\nc");
});

test("decodeUtf8Strict returns ok for valid utf8", () => {
  const bytes = new TextEncoder().encode("hello");
  const result = decodeUtf8Strict(bytes);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.text, "hello");
});

test("decodeUtf8Strict returns error for invalid utf8", () => {
  const bytes = new Uint8Array([0xc3, 0x28]);
  const result = decodeUtf8Strict(bytes);
  assert.equal(result.ok, false);
});

test("decodeUtf8StrictOrThrow throws for invalid utf8", () => {
  const bytes = new Uint8Array([0xc3, 0x28]);
  assert.throws(() => decodeUtf8StrictOrThrow(bytes));
});
