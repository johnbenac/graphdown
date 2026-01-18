export function toBytes(contents: Uint8Array | string): Uint8Array {
  if (typeof contents === "string") {
    return new TextEncoder().encode(contents);
  }

  return contents;
}
