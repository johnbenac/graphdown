import { sha256 } from '@noble/hashes/sha256';

export type DaslCodec = 'raw' | 'drisl';

export type DecodedDaslCid = {
  version: 1;
  codec: DaslCodec;
  hashType: 0x12;
  hashSize: 0x20;
  digest: Uint8Array;
  cidBytes: Uint8Array;
};

const BASE32_ALPHABET = 'abcdefghijklmnopqrstuvwxyz234567';
const BASE32_LOOKUP: Record<string, number> = Object.fromEntries(
  BASE32_ALPHABET.split('').map((char, index) => [char, index])
);

function base32Encode(bytes: Uint8Array): string {
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

function base32Decode(input: string): Uint8Array {
  if (input.length === 0) {
    return new Uint8Array();
  }
  let buffer = 0;
  let bits = 0;
  const output: number[] = [];
  for (const char of input) {
    if (char === '=') {
      throw new Error('Base32 padding is not allowed');
    }
    const value = BASE32_LOOKUP[char];
    if (value === undefined) {
      throw new Error('Invalid base32 character');
    }
    buffer = (buffer << 5) | value;
    bits += 5;
    while (bits >= 8) {
      const byte = (buffer >> (bits - 8)) & 0xff;
      output.push(byte);
      bits -= 8;
    }
  }
  if (bits > 0) {
    const remainderMask = (1 << bits) - 1;
    if ((buffer & remainderMask) !== 0) {
      throw new Error('Non-zero base32 padding bits');
    }
  }
  return Uint8Array.from(output);
}

function buildCidBytes(digest: Uint8Array, codec: DaslCodec): Uint8Array {
  if (digest.length !== 32) {
    throw new Error('Digest must be 32 bytes');
  }
  const codecByte = codec === 'raw' ? 0x55 : 0x71;
  const cidBytes = new Uint8Array(4 + digest.length);
  cidBytes[0] = 0x01;
  cidBytes[1] = codecByte;
  cidBytes[2] = 0x12;
  cidBytes[3] = 0x20;
  cidBytes.set(digest, 4);
  return cidBytes;
}

function hexByte(value: number): string {
  return value.toString(16).padStart(2, '0');
}

export function cidFromRawBytes(bytes: Uint8Array): string {
  const digest = sha256(bytes);
  const cidBytes = buildCidBytes(digest, 'raw');
  return `b${base32Encode(cidBytes)}`;
}

export function decodeDaslCidString(cid: string): DecodedDaslCid {
  if (!cid.startsWith('b')) {
    throw new Error('CID must start with "b"');
  }
  if (/[A-Z]/.test(cid)) {
    throw new Error('CID must be lowercase');
  }
  if (cid.includes('=')) {
    throw new Error('CID must not include padding');
  }
  const encoded = cid.slice(1);
  const cidBytes = base32Decode(encoded);
  if (cidBytes.length !== 36) {
    throw new Error('CID must decode to 36 bytes');
  }
  const version = cidBytes[0];
  if (version !== 0x01) {
    throw new Error('CID version must be 1');
  }
  const codecByte = cidBytes[1];
  let codec: DaslCodec;
  if (codecByte === 0x55) {
    codec = 'raw';
  } else if (codecByte === 0x71) {
    codec = 'drisl';
  } else {
    throw new Error('CID codec must be raw or drisl');
  }
  const hashType = cidBytes[2];
  if (hashType !== 0x12) {
    throw new Error('CID hash type must be sha2-256');
  }
  const hashSize = cidBytes[3];
  if (hashSize !== 0x20) {
    throw new Error('CID hash size must be 32 bytes');
  }
  const digest = cidBytes.slice(4);
  if (digest.length !== 32) {
    throw new Error('CID digest must be 32 bytes');
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
