import { sha256 } from '@noble/hashes/sha256';

const BASE32_ALPHABET = 'abcdefghijklmnopqrstuvwxyz234567';
const BASE32_LOOKUP = (() => {
  const table = new Int16Array(256).fill(-1);
  for (let i = 0; i < BASE32_ALPHABET.length; i += 1) {
    table[BASE32_ALPHABET.charCodeAt(i)] = i;
  }
  return table;
})();

function encodeBase32(bytes: Uint8Array): string {
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

function decodeBase32(input: string): Uint8Array {
  if (input.length === 0) {
    return new Uint8Array();
  }
  const bytes: number[] = [];
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

export type DaslCodec = 'raw' | 'drisl';

export type DecodedDaslCid = {
  version: 1;
  codec: DaslCodec;
  hashType: 0x12;
  hashSize: 0x20;
  digest: Uint8Array;
  cidBytes: Uint8Array;
};

function encodeDaslCidBytes(cidBytes: Uint8Array): string {
  return `b${encodeBase32(cidBytes)}`;
}

function decodeDaslCidBytes(cid: string): Uint8Array {
  if (!cid.startsWith('b')) {
    throw new Error('CID must start with b');
  }
  if (/[A-Z]/.test(cid)) {
    throw new Error('CID must be lowercase');
  }
  if (cid.includes('=')) {
    throw new Error('CID must not contain padding');
  }
  const body = cid.slice(1);
  if (!/^[a-z2-7]+$/.test(body)) {
    throw new Error('CID contains invalid base32 characters');
  }
  return decodeBase32(body);
}

function hexByte(byte: number): string {
  return byte.toString(16).padStart(2, '0');
}

export function cidFromRawBytes(bytes: Uint8Array): string {
  const digest = sha256(bytes);
  const cidBytes = Uint8Array.of(0x01, 0x55, 0x12, 0x20, ...digest);
  return encodeDaslCidBytes(cidBytes);
}

export function decodeDaslCidString(cid: string): DecodedDaslCid {
  const cidBytes = decodeDaslCidBytes(cid);
  if (cidBytes.length !== 36) {
    throw new Error('CID must decode to 36 bytes');
  }
  const version = cidBytes[0];
  if (version !== 0x01) {
    throw new Error('CID must have version 1');
  }
  const codecByte = cidBytes[1];
  let codec: DaslCodec;
  if (codecByte === 0x55) {
    codec = 'raw';
  } else if (codecByte === 0x71) {
    codec = 'drisl';
  } else {
    throw new Error('CID must have raw or drisl codec');
  }
  const hashType = cidBytes[2];
  if (hashType !== 0x12) {
    throw new Error('CID must use sha2-256');
  }
  const hashSize = cidBytes[3];
  if (hashSize !== 0x20) {
    throw new Error('CID must have 32-byte digest');
  }
  const digest = cidBytes.slice(4);
  if (digest.length !== 32) {
    throw new Error('CID must have 32-byte digest');
  }
  return {
    version: 1,
    codec,
    hashType: 0x12,
    hashSize: 0x20,
    digest,
    cidBytes,
  };
}

export function isDaslCidString(cid: string): boolean {
  try {
    decodeDaslCidString(cid);
    return true;
  } catch {
    return false;
  }
}

export function blockPathForCid(cid: string): string {
  const decoded = decodeDaslCidString(cid);
  const prefix = hexByte(decoded.digest[0]);
  return `blocks/sha2-256/${prefix}/${cid}`;
}
