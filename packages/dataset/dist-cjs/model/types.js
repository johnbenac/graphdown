"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isObject = isObject;
exports.getString = getString;
function isObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function getString(obj, key) {
    const value = obj[key];
    return typeof value === 'string' ? value : undefined;
}
