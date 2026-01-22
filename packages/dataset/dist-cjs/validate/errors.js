"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeError = makeError;
function makeError(code, message, file, hint) {
    return { code, message, file, hint };
}
