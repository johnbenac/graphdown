export type Utf8DecodeFailureReason = 'no-decoder' | 'invalid-utf8';

export type Utf8DecodeResult =
  | { ok: true; text: string }
  | { ok: false; reason: Utf8DecodeFailureReason };

type TextDecoderInstance = InstanceType<typeof TextDecoder>;
let cachedDecoder: TextDecoderInstance | null | undefined;

function getUtf8Decoder(): TextDecoderInstance | null {
  if (cachedDecoder !== undefined) return cachedDecoder;
  cachedDecoder =
    typeof TextDecoder !== 'undefined'
      ? new TextDecoder('utf-8', { fatal: true })
      : null;
  return cachedDecoder;
}

export function decodeUtf8Strict(bytes: Uint8Array): Utf8DecodeResult {
  const decoder = getUtf8Decoder();
  if (decoder) {
    try {
      return { ok: true, text: decoder.decode(bytes) };
    } catch {
      return { ok: false, reason: 'invalid-utf8' };
    }
  }

  if (typeof Buffer !== 'undefined') {
    try {
      const buffer = Buffer.from(bytes);
      const text = buffer.toString('utf8');
      const roundTrip = Buffer.from(text, 'utf8');
      if (!roundTrip.equals(buffer)) return { ok: false, reason: 'invalid-utf8' };
      return { ok: true, text };
    } catch {
      return { ok: false, reason: 'invalid-utf8' };
    }
  }

  return { ok: false, reason: 'no-decoder' };
}

export function decodeUtf8StrictOrThrow(bytes: Uint8Array): string {
  const decoder = getUtf8Decoder();
  if (decoder) {
    return decoder.decode(bytes);
  }
  if (typeof Buffer !== 'undefined') {
    const buffer = Buffer.from(bytes);
    const text = buffer.toString('utf8');
    const roundTrip = Buffer.from(text, 'utf8');
    if (!roundTrip.equals(buffer)) {
      throw new Error('Invalid UTF-8');
    }
    return text;
  }
  throw new Error('No UTF-8 decoder available');
}

export function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n?/g, '\n');
}
