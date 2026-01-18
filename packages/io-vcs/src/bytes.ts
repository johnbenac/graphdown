const encoder = new TextEncoder();

export function toBytes(content: Uint8Array | string): Uint8Array {
  if (content instanceof Uint8Array) {
    return content;
  }
  return encoder.encode(content);
}
