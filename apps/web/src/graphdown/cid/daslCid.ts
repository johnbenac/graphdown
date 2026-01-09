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
const BASE32_LOOKUP = (() => {
  const table = new Int16Array(256).fill(-1);
  for (let i = 0; i < BASE32_ALPHABET.length; i += 1) {
    table[BASE32_ALPHABET.charCodeAt(i)] = i;
  }
  return table;
})();

function encodeBase32(bytes: Uint8Array): string {
  let value = 0;
  let bits = 0;
  let output = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function decodeBase32(input: string): Uint8Array {
  let value = 0;
  let bits = 0;
  const out: number[] = [];
  for (const char of input) {
    const code = char.charCodeAt(0);
    const index = code < 256 ? BASE32_LOOKUP[code] : -1;
    if (index < 0) {
      throw new Error(`Invalid base32 character: ${char}`);
    }
    value = (value << 5) | index;
    bits += 5;
    while (bits >= 8) {
      out.push((value >> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Uint8Array.from(out);
}

function digestPrefixHex(digest: Uint8Array): string {
  return digest[0].toString(16).padStart(2, '0');
}

export function cidFromRawBytes(bytes: Uint8Array): string {
  const digest = sha256(bytes);
  const cidBytes = Uint8Array.of(0x01, 0x55, 0x12, 0x20, ...digest);
  return `b${encodeBase32(cidBytes)}`;
}

export function decodeDaslCidString(cid: string): DecodedDaslCid {
  if (!cid.startsWith('b')) {
    throw new Error('CID must start with b');
  }
  if (cid.includes('=')) {
    throw new Error('CID must not include padding');
  }
  if (/[A-Z]/.test(cid)) {
    throw new Error('CID must be lowercase');
  }
  const base32 = cid.slice(1);
  if (!base32.length || !/^[a-z2-7]+$/.test(base32)) {
    throw new Error('CID must be base32 lowercase without padding');
  }
  const cidBytes = decodeBase32(base32);
  if (cidBytes.length !== 36) {
    throw new Error('CID must decode to 36 bytes');
  }
  if (cidBytes[0] !== 0x01) {
    throw new Error('CID version must be 0x01');
  }
  const codecByte = cidBytes[1];
  const codec: DaslCodec = codecByte === 0x55 ? 'raw' : codecByte === 0x71 ? 'drisl' : null;
  if (!codec) {
    throw new Error('CID codec must be raw or drisl');
  }
  if (cidBytes[2] !== 0x12) {
    throw new Error('CID hash type must be sha2-256');
  }
  if (cidBytes[3] !== 0x20) {
    throw new Error('CID hash size must be 32');
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
  const prefix = digestPrefixHex(decoded.digest);
  return `blocks/sha2-256/${prefix}/${cid}`;
}
