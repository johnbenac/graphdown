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
  [...BASE32_ALPHABET].map((char, index) => [char, index])
);

function encodeBase32(bytes: Uint8Array): string {
  if (bytes.length === 0) {
    return '';
  }
  let buffer = 0;
  let bits = 0;
  let output = '';
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      output += BASE32_ALPHABET[(buffer >> bits) & 31];
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(buffer << (5 - bits)) & 31];
  }
  return output;
}

function decodeBase32(input: string): Uint8Array {
  if (input.includes('=')) {
    throw new Error('Base32 padding is not allowed');
  }
  let buffer = 0;
  let bits = 0;
  const output: number[] = [];
  for (const char of input) {
    const value = BASE32_LOOKUP[char];
    if (value === undefined) {
      throw new Error(`Invalid base32 character: ${char}`);
    }
    buffer = (buffer << 5) | value;
    bits += 5;
    while (bits >= 8) {
      bits -= 8;
      output.push((buffer >> bits) & 0xff);
    }
  }
  if (bits > 0) {
    const mask = (1 << bits) - 1;
    if ((buffer & mask) !== 0) {
      throw new Error('Invalid trailing base32 bits');
    }
  }
  return new Uint8Array(output);
}

function bytesToHexByte(value: number): string {
  return value.toString(16).padStart(2, '0');
}

export function cidFromRawBytes(bytes: Uint8Array): string {
  const digest = sha256(bytes);
  const cidBytes = new Uint8Array(4 + digest.length);
  cidBytes.set([0x01, 0x55, 0x12, 0x20], 0);
  cidBytes.set(digest, 4);
  return `b${encodeBase32(cidBytes)}`;
}

export function decodeDaslCidString(cid: string): DecodedDaslCid {
  if (!cid.startsWith('b')) {
    throw new Error('CID must start with b');
  }
  const body = cid.slice(1);
  if (body.length !== 58) {
    throw new Error('CID has invalid length');
  }
  const cidBytes = decodeBase32(body);
  if (cidBytes.length !== 36) {
    throw new Error('CID decoded bytes must be 36 bytes');
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
    cidBytes
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
  const prefix = bytesToHexByte(decoded.digest[0]);
  return `blocks/sha2-256/${prefix}/${cid}`;
}
