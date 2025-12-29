export function decodeUtf8(contents: Uint8Array): string {
  if (typeof TextDecoder !== 'undefined') {
    return new TextDecoder('utf-8').decode(contents);
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(contents).toString('utf8');
  }
  throw new Error('No UTF-8 decoder available in this environment.');
}
