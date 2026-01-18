const encoder = new TextEncoder();

export function toBytes(content: Uint8Array | string): Uint8Array {
  if (typeof content === "string") {
    return encoder.encode(content);
  }
  return content;
}
