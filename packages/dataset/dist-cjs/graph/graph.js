"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildRecordLinkGraphFromSnapshot = buildRecordLinkGraphFromSnapshot;
const datasetObjects_1 = require("../parse/datasetObjects");
const errors_1 = require("../validate/errors");
const wikiRefs_1 = require("../parse/wikiRefs");
const collectStringValues_1 = require("../internal/collectStringValues");
function collectRecordRefsFromRecord(fields, body) {
    const strings = new Set();
    (0, collectStringValues_1.collectStringValues)(fields, strings);
    (0, collectStringValues_1.collectStringValues)(body, strings);
    const refs = new Set();
    for (const value of strings) {
        for (const ref of (0, wikiRefs_1.extractRecordRefs)(value)) {
            refs.add(ref);
        }
    }
    return refs;
}
class RecordLinkGraphImpl {
    typesById;
    recordsByKey;
    nodesByIdentity;
    outgoingRecordLinks;
    incomingRecordLinks;
    constructor(typesById, recordsByKey, nodesByIdentity, outgoingRecordLinks, incomingRecordLinks) {
        this.typesById = typesById;
        this.recordsByKey = recordsByKey;
        this.nodesByIdentity = nodesByIdentity;
        this.outgoingRecordLinks = outgoingRecordLinks;
        this.incomingRecordLinks = incomingRecordLinks;
    }
    getOutgoingRecordLinks(recordKey) {
        const links = this.outgoingRecordLinks.get(recordKey);
        return links ? [...links].sort((a, b) => a.localeCompare(b)) : [];
    }
    getIncomingRecordLinks(recordKey) {
        const links = this.incomingRecordLinks.get(recordKey);
        return links ? [...links].sort((a, b) => a.localeCompare(b)) : [];
    }
    getType(typeId) {
        return this.typesById.get(typeId) ?? null;
    }
    getRecord(recordKey) {
        return this.recordsByKey.get(recordKey) ?? null;
    }
    getTypeForRecord(recordKey) {
        const record = this.recordsByKey.get(recordKey);
        if (!record)
            return null;
        return this.typesById.get(record.typeId) ?? null;
    }
    getTypeIdForIdentity(identity) {
        const record = this.recordsByKey.get(identity);
        if (record)
            return record.typeId;
        const type = this.typesById.get(identity);
        if (type)
            return type.typeId;
        return null;
    }
}
function buildRecordLinkGraphFromSnapshot(snapshot) {
    const parsed = (0, datasetObjects_1.discoverGraphdownObjects)(snapshot);
    if (parsed.errors.length) {
        return { ok: false, errors: parsed.errors };
    }
    const errors = [];
    const typesById = new Map();
    const recordsByKey = new Map();
    const nodesByIdentity = new Map();
    const outgoingRecordLinks = new Map();
    const incomingRecordLinks = new Map();
    for (const typeObj of parsed.typeObjects) {
        if (typesById.has(typeObj.typeId)) {
            errors.push((0, errors_1.makeError)('E_DUPLICATE_ID', `Duplicate typeId ${typeObj.typeId}`, typeObj.file));
            continue;
        }
        const typeNode = {
            kind: 'type',
            typeId: typeObj.typeId,
            fields: typeObj.fields,
            body: typeObj.body,
            file: typeObj.file,
        };
        typesById.set(typeObj.typeId, typeNode);
        nodesByIdentity.set(typeObj.typeId, typeNode);
    }
    for (const recordObj of parsed.recordObjects) {
        if (recordsByKey.has(recordObj.identity)) {
            errors.push((0, errors_1.makeError)('E_DUPLICATE_ID', `Duplicate record identity ${recordObj.identity}`, recordObj.file));
            continue;
        }
        if (!typesById.has(recordObj.typeId)) {
            errors.push((0, errors_1.makeError)('E_TYPEID_MISMATCH', `Record ${recordObj.identity} references missing typeId ${recordObj.typeId}`, recordObj.file));
        }
        const recordNode = {
            kind: 'record',
            typeId: recordObj.typeId,
            recordId: recordObj.recordId,
            recordKey: recordObj.identity,
            fields: recordObj.fields,
            body: recordObj.body,
            file: recordObj.file,
        };
        recordsByKey.set(recordObj.identity, recordNode);
        nodesByIdentity.set(recordObj.identity, recordNode);
    }
    for (const record of recordsByKey.values()) {
        const refs = collectRecordRefsFromRecord(record.fields, record.body);
        if (!refs.size)
            continue;
        outgoingRecordLinks.set(record.recordKey, refs);
        for (const ref of refs) {
            if (!incomingRecordLinks.has(ref)) {
                incomingRecordLinks.set(ref, new Set());
            }
            incomingRecordLinks.get(ref)?.add(record.recordKey);
        }
    }
    if (errors.length) {
        return { ok: false, errors };
    }
    return {
        ok: true,
        graph: new RecordLinkGraphImpl(typesById, recordsByKey, nodesByIdentity, outgoingRecordLinks, incomingRecordLinks),
    };
}
