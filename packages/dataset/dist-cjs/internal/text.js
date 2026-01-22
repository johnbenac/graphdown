"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeUtf8Strict = decodeUtf8Strict;
exports.decodeUtf8StrictOrThrow = decodeUtf8StrictOrThrow;
exports.normalizeLineEndings = normalizeLineEndings;
let cachedDecoder;
function getUtf8Decoder() {
    if (cachedDecoder !== undefined)
        return cachedDecoder;
    cachedDecoder =
        typeof TextDecoder !== 'undefined'
            ? new TextDecoder('utf-8', { fatal: true })
            : null;
    return cachedDecoder;
}
function decodeUtf8Strict(bytes) {
    const decoder = getUtf8Decoder();
    if (decoder) {
        try {
            return { ok: true, text: decoder.decode(bytes) };
        }
        catch {
            return { ok: false, reason: 'invalid-utf8' };
        }
    }
    if (typeof Buffer !== 'undefined') {
        try {
            const buffer = Buffer.from(bytes);
            const text = buffer.toString('utf8');
            const roundTrip = Buffer.from(text, 'utf8');
            if (!roundTrip.equals(buffer))
                return { ok: false, reason: 'invalid-utf8' };
            return { ok: true, text };
        }
        catch {
            return { ok: false, reason: 'invalid-utf8' };
        }
    }
    return { ok: false, reason: 'no-decoder' };
}
function decodeUtf8StrictOrThrow(bytes) {
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
function normalizeLineEndings(text) {
    return text.replace(/\r\n?/g, '\n');
}
