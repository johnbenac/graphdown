"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectStringValues = collectStringValues;
const types_1 = require("../model/types");
function collectStringValues(value, into) {
    if (typeof value === 'string') {
        into.add(value);
        return;
    }
    if (Array.isArray(value)) {
        for (const item of value) {
            collectStringValues(item, into);
        }
        return;
    }
    if ((0, types_1.isObject)(value)) {
        for (const child of Object.values(value)) {
            collectStringValues(child, into);
        }
    }
}
