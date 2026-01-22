"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractRecordRefs = extractRecordRefs;
exports.extractCidRefs = extractCidRefs;
const daslCid_1 = require("../cid/daslCid");
const RECORD_REF_PATTERN = /^([A-Za-z0-9][A-Za-z0-9_-]*):([A-Za-z0-9][A-Za-z0-9_-]*)$/;
const CID_SHAPE_PATTERN = /^b[a-z2-7]{58}$/;
function extractTokens(text) {
    const results = [];
    const regex = /\[\[([^\]]+?)\]\]/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
        results.push(match[1]);
    }
    return results;
}
function extractRecordRefs(text) {
    const tokens = extractTokens(text);
    const refs = [];
    for (const token of tokens) {
        const trimmed = token.trim();
        const match = trimmed.match(RECORD_REF_PATTERN);
        if (!match)
            continue;
        refs.push(`${match[1]}:${match[2]}`);
    }
    return refs;
}
function extractCidRefs(text) {
    const tokens = extractTokens(text);
    const cids = [];
    const invalidCidTokens = [];
    for (const token of tokens) {
        const trimmed = token.trim();
        if (!CID_SHAPE_PATTERN.test(trimmed)) {
            continue;
        }
        try {
            (0, daslCid_1.decodeDaslCidString)(trimmed);
            cids.push(trimmed);
        }
        catch {
            invalidCidTokens.push(trimmed);
        }
    }
    return { cids, invalidCidTokens };
}
