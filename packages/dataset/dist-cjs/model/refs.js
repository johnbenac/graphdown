"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeRef = normalizeRef;
exports.normalizeRefs = normalizeRefs;
const ids_1 = require("./ids");
function normalizeRef(value) {
    return (0, ids_1.cleanId)(value);
}
function normalizeRefs(value) {
    if (Array.isArray(value)) {
        return value.map(normalizeRef).filter((id) => Boolean(id));
    }
    const normalized = normalizeRef(value);
    return normalized ? [normalized] : [];
}
