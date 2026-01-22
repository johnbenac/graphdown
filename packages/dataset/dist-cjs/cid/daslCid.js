"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cidFromRawBytes = cidFromRawBytes;
exports.decodeDaslCidString = decodeDaslCidString;
exports.isDaslCidString = isDaslCidString;
exports.blockPathForCid = blockPathForCid;
const sha256_1 = require("@noble/hashes/sha256");
const base32_1 = require("./base32");
function encodeDaslCidBytes(cidBytes) {
    return `b${(0, base32_1.encodeBase32)(cidBytes)}`;
}
function decodeDaslCidBytes(cid) {
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
    if (body.length !== 58) {
        throw new Error('CID must have 58 base32 characters');
    }
    if (!/^[a-z2-7]+$/.test(body)) {
        throw new Error('CID contains invalid base32 characters');
    }
    return (0, base32_1.decodeBase32)(body);
}
function hexByte(byte) {
    return byte.toString(16).padStart(2, '0');
}
function cidFromRawBytes(bytes) {
    const digest = (0, sha256_1.sha256)(bytes);
    const cidBytes = Uint8Array.of(0x01, 0x55, 0x12, 0x20, ...digest);
    return encodeDaslCidBytes(cidBytes);
}
function decodeDaslCidString(cid) {
    const cidBytes = decodeDaslCidBytes(cid);
    if (cidBytes.length !== 36) {
        throw new Error('CID must decode to 36 bytes');
    }
    const version = cidBytes[0];
    if (version !== 0x01) {
        throw new Error('CID must have version 1');
    }
    const codecByte = cidBytes[1];
    let codec;
    if (codecByte === 0x55) {
        codec = 'raw';
    }
    else if (codecByte === 0x71) {
        codec = 'drisl';
    }
    else {
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
function isDaslCidString(cid) {
    try {
        decodeDaslCidString(cid);
        return true;
    }
    catch {
        return false;
    }
}
function blockPathForCid(cid) {
    const decoded = decodeDaslCidString(cid);
    const prefix = hexByte(decoded.digest[0]);
    return `blocks/sha2-256/${prefix}/${cid}`;
}
