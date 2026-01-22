"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RECORD_KEY_PATTERN = exports.IDENTIFIER_PATTERN = void 0;
exports.parseGraphdownText = parseGraphdownText;
exports.parseGraphdownFile = parseGraphdownFile;
exports.discoverGraphdownObjects = discoverGraphdownObjects;
const frontMatter_1 = require("./frontMatter");
const errors_1 = require("../validate/errors");
const types_1 = require("../model/types");
const yaml_1 = require("./yaml");
const text_1 = require("../internal/text");
const pluginObjects_1 = require("./pluginObjects");
const recordFile_1 = require("./recordFile");
exports.IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
exports.RECORD_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*:[A-Za-z0-9][A-Za-z0-9_-]*$/;
function decodeUtf8(bytes, file) {
    const result = (0, text_1.decodeUtf8Strict)(bytes);
    if (result.ok)
        return { ok: true, text: result.text };
    if (result.reason === 'no-decoder') {
        return { ok: false, error: (0, errors_1.makeError)('E_INTERNAL', 'TextDecoder not available', file) };
    }
    return { ok: false, error: (0, errors_1.makeError)('E_UTF8_INVALID', 'Invalid UTF-8 encoding', file) };
}
function validateIdentifier(value, key, file) {
    if (typeof value !== 'string') {
        return {
            ok: false,
            error: (0, errors_1.makeError)('E_INVALID_IDENTIFIER', `${key} must be a string`, file),
        };
    }
    const trimmed = value.trim();
    if (!trimmed) {
        return {
            ok: false,
            error: (0, errors_1.makeError)('E_INVALID_IDENTIFIER', `${key} must be non-empty after trimming`, file),
        };
    }
    if (!exports.IDENTIFIER_PATTERN.test(trimmed)) {
        return {
            ok: false,
            error: (0, errors_1.makeError)('E_INVALID_IDENTIFIER', `${key} must match ${exports.IDENTIFIER_PATTERN.source} and MUST NOT contain ":"`, file),
        };
    }
    if (trimmed.includes(':')) {
        return {
            ok: false,
            error: (0, errors_1.makeError)('E_INVALID_IDENTIFIER', `${key} must not contain ":"`, file),
        };
    }
    return { ok: true, value: trimmed };
}
function parseGraphdownText(path, text) {
    try {
        const normalized = (0, text_1.normalizeLineEndings)(text);
        let yamlSection;
        let body;
        try {
            ({ yaml: yamlSection, body } = (0, frontMatter_1.extractFrontMatter)(normalized));
        }
        catch {
            return { kind: 'ignored' };
        }
        let yamlObject;
        try {
            yamlObject = (0, yaml_1.parseYamlObject)(yamlSection);
        }
        catch {
            return { kind: 'ignored' };
        }
        const typeIdCheck = validateIdentifier(yamlObject.typeId, 'typeId', path);
        if (!typeIdCheck.ok) {
            // If no typeId, this file is ignored (LAYOUT-001); but a non-string typeId is an error.
            if (yamlObject.typeId === undefined) {
                return { kind: 'ignored' };
            }
            return { kind: 'error', error: typeIdCheck.error };
        }
        const typeId = typeIdCheck.value;
        const topLevelKeys = Object.keys(yamlObject);
        const hasRecordId = Object.prototype.hasOwnProperty.call(yamlObject, 'recordId');
        const declaredKind = hasRecordId ? 'record' : 'type';
        const makeDeclaredError = (error) => ({
            kind: 'error',
            error,
            declaredTypeId: typeId,
            declaredKind
        });
        if (hasRecordId) {
            const allowed = new Set(['typeId', 'recordId', 'fields', 'parent']);
            for (const key of topLevelKeys) {
                if (!allowed.has(key)) {
                    return makeDeclaredError((0, errors_1.makeError)('E_FORBIDDEN_TOP_LEVEL_KEY', `Top-level key "${key}" is not allowed in record objects`, path));
                }
            }
        }
        else {
            const allowed = new Set(['typeId', 'fields']);
            for (const key of topLevelKeys) {
                if (!allowed.has(key)) {
                    return makeDeclaredError((0, errors_1.makeError)('E_FORBIDDEN_TOP_LEVEL_KEY', `Top-level key "${key}" is not allowed in type objects`, path));
                }
            }
        }
        const fields = yamlObject.fields;
        if (!(0, types_1.isObject)(fields)) {
            return makeDeclaredError((0, errors_1.makeError)('E_REQUIRED_FIELD_MISSING', 'fields must be an object', path));
        }
        if (hasRecordId) {
            const recordIdCheck = validateIdentifier(yamlObject.recordId, 'recordId', path);
            if (!recordIdCheck.ok) {
                return makeDeclaredError(recordIdCheck.error);
            }
            const recordId = recordIdCheck.value;
            let parent;
            if (Object.prototype.hasOwnProperty.call(yamlObject, 'parent')) {
                const parentValue = yamlObject.parent;
                if (parentValue === null) {
                    parent = null;
                }
                else if (typeof parentValue === 'string') {
                    if (!exports.RECORD_KEY_PATTERN.test(parentValue)) {
                        return makeDeclaredError((0, errors_1.makeError)('E_PARENT_INVALID', `parent must match ${exports.RECORD_KEY_PATTERN.source}`, path));
                    }
                    parent = parentValue;
                }
                else {
                    return makeDeclaredError((0, errors_1.makeError)('E_PARENT_INVALID', 'parent must be null or a record key string', path));
                }
            }
            return {
                kind: 'record',
                file: path,
                typeId,
                recordId,
                parent,
                fields,
                body,
                identity: `${typeId}:${recordId}`,
            };
        }
        return {
            kind: 'type',
            file: path,
            typeId,
            fields,
            body,
            identity: typeId,
        };
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { kind: 'error', error: (0, errors_1.makeError)('E_INTERNAL', message, path) };
    }
}
function parseGraphdownFile(path, bytes) {
    if (!(0, recordFile_1.isRecordFileBytes)(path, bytes)) {
        return { kind: 'ignored' };
    }
    const decoded = decodeUtf8(bytes, path);
    if (!decoded.ok) {
        return { kind: 'error', error: decoded.error };
    }
    return parseGraphdownText(path, decoded.text);
}
function discoverGraphdownObjects(snapshot) {
    const typeObjects = [];
    const recordObjects = [];
    const ignored = [];
    const errors = [];
    const declaredTypeIds = [];
    const files = [...snapshot.files.keys()].sort((a, b) => a.localeCompare(b));
    // Collect plugin bundle paths so they can be excluded from record/type discovery.
    const { pluginManifestPaths, pluginBundlePaths } = (0, pluginObjects_1.discoverPluginObjects)(snapshot);
    for (const file of files) {
        if (pluginBundlePaths.has(file) || pluginManifestPaths.has(file)) {
            ignored.push(file);
            continue;
        }
        const bytes = snapshot.files.get(file);
        if (!bytes)
            continue;
        const parsed = parseGraphdownFile(file, bytes);
        if (parsed.kind === 'ignored') {
            ignored.push(file);
            continue;
        }
        if (parsed.kind === 'error') {
            errors.push(parsed.error);
            if (parsed.declaredKind === 'type' && parsed.declaredTypeId) {
                declaredTypeIds.push(parsed.declaredTypeId);
            }
            continue;
        }
        if (parsed.kind === 'type') {
            typeObjects.push(parsed);
        }
        else if (parsed.kind === 'record') {
            recordObjects.push(parsed);
        }
    }
    return { typeObjects, recordObjects, ignored, errors, declaredTypeIds };
}
