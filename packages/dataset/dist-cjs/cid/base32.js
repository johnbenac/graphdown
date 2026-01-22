"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodeBase32 = encodeBase32;
exports.decodeBase32 = decodeBase32;
const BASE32_ALPHABET = 'abcdefghijklmnopqrstuvwxyz234567';
const BASE32_LOOKUP = (() => {
    const table = new Int16Array(256).fill(-1);
    for (let i = 0; i < BASE32_ALPHABET.length; i += 1) {
        table[BASE32_ALPHABET.charCodeAt(i)] = i;
    }
    return table;
})();
function encodeBase32(bytes) {
    let output = '';
    let buffer = 0;
    let bits = 0;
    for (const byte of bytes) {
        buffer = (buffer << 8) | byte;
        bits += 8;
        while (bits >= 5) {
            const index = (buffer >> (bits - 5)) & 31;
            output += BASE32_ALPHABET[index];
            bits -= 5;
        }
    }
    if (bits > 0) {
        const index = (buffer << (5 - bits)) & 31;
        output += BASE32_ALPHABET[index];
    }
    return output;
}
function decodeBase32(input) {
    if (input.length === 0) {
        return new Uint8Array();
    }
    const bytes = [];
    let buffer = 0;
    let bits = 0;
    for (const char of input) {
        const code = char.charCodeAt(0);
        const value = code < BASE32_LOOKUP.length ? BASE32_LOOKUP[code] : -1;
        if (value === -1) {
            throw new Error(`Invalid base32 character: ${char}`);
        }
        buffer = (buffer << 5) | value;
        bits += 5;
        while (bits >= 8) {
            const byte = (buffer >> (bits - 8)) & 0xff;
            bytes.push(byte);
            bits -= 8;
        }
    }
    if (bits > 0) {
        const remainder = buffer & ((1 << bits) - 1);
        if (remainder !== 0) {
            throw new Error('Invalid base32 padding');
        }
    }
    return Uint8Array.from(bytes);
}
