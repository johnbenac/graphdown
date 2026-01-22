"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SAFE_IDENTIFIER_PATTERN = void 0;
exports.cleanId = cleanId;
exports.isValidPluginId = isValidPluginId;
function cleanId(value) {
    if (typeof value !== 'string') {
        return null;
    }
    let cleaned = value.trim();
    if (!cleaned) {
        return null;
    }
    const match = cleaned.match(/^\[\[(.*)\]\]$/);
    if (match) {
        cleaned = match[1].trim();
    }
    return cleaned || null;
}
exports.SAFE_IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
function isValidPluginId(value) {
    if (typeof value !== 'string')
        return false;
    if (value.trim().length === 0)
        return false;
    return exports.SAFE_IDENTIFIER_PATTERN.test(value);
}
