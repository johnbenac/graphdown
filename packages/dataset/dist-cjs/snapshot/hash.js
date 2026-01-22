"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeGdHashV1 = computeGdHashV1;
const sha256_1 = require("@noble/hashes/sha256");
const base32_1 = require("../cid/base32");
const ids_1 = require("../model/ids");
const datasetObjects_1 = require("../parse/datasetObjects");
const recordFile_1 = require("../parse/recordFile");
const pluginObjects_1 = require("../parse/pluginObjects");
const pluginManifest_1 = require("../parse/pluginManifest");
const errors_1 = require("../validate/errors");
const text_1 = require("../internal/text");
const encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
function lexCompareBytes(a, b) {
    const length = Math.min(a.length, b.length);
    for (let i = 0; i < length; i++) {
        if (a[i] !== b[i]) {
            return a[i] < b[i] ? -1 : 1;
        }
    }
    if (a.length === b.length)
        return 0;
    return a.length < b.length ? -1 : 1;
}
function computeGdHashV1(snapshot, scope) {
    if (scope !== 'schema' && scope !== 'snapshot') {
        return { ok: false, errors: [(0, errors_1.makeError)('E_USAGE', `Unknown hash scope: ${String(scope)}`)] };
    }
    if (!encoder) {
        return { ok: false, errors: [(0, errors_1.makeError)('E_INTERNAL', 'TextEncoder not available for hashing')] };
    }
    const entries = [];
    const errors = [];
    const seenIds = new Set();
    const pluginManifests = [];
    const files = [...snapshot.files.keys()].sort((a, b) => a.localeCompare(b));
    for (const file of files) {
        const raw = snapshot.files.get(file);
        if (!raw)
            continue;
        if (!(0, recordFile_1.isRecordFileBytes)(file, raw))
            continue;
        const decoded = (0, text_1.decodeUtf8Strict)(raw);
        if (!decoded.ok) {
            if (decoded.reason === 'no-decoder') {
                errors.push((0, errors_1.makeError)('E_INTERNAL', 'TextDecoder not available for UTF-8 decode', file));
            }
            else {
                errors.push((0, errors_1.makeError)('E_UTF8_INVALID', 'Invalid UTF-8 encoding', file));
            }
            continue;
        }
        const normalizedText = (0, text_1.normalizeLineEndings)(decoded.text);
        const parsed = (0, datasetObjects_1.parseGraphdownText)(file, normalizedText);
        if (parsed.kind === 'error') {
            errors.push(parsed.error);
            continue;
        }
        if (parsed.kind === 'ignored') {
            continue;
        }
        const include = (scope === 'schema' && parsed.kind === 'type') ||
            (scope === 'snapshot' && (parsed.kind === 'type' || parsed.kind === 'record'));
        if (!include)
            continue;
        if (seenIds.has(parsed.identity)) {
            errors.push((0, errors_1.makeError)('E_DUPLICATE_ID', `Duplicate identity detected during hashing: ${parsed.identity}`, file));
            continue;
        }
        seenIds.add(parsed.identity);
        const contentBytes = encoder.encode(normalizedText);
        const idBytes = encoder.encode(parsed.identity);
        entries.push({ id: parsed.identity, idBytes, file, bytes: contentBytes });
    }
    if (scope === 'snapshot') {
        const discovered = (0, pluginObjects_1.discoverPluginObjects)(snapshot);
        for (const plugin of discovered.plugins) {
            const manifestPath = plugin.manifest.file;
            const yaml = plugin.manifest.yaml;
            const pluginId = yaml.pluginId;
            if (typeof pluginId !== 'string' || !(0, ids_1.isValidPluginId)(pluginId)) {
                errors.push((0, errors_1.makeError)('E_PLUGIN_KEYS_INVALID', `Plugin manifest ${manifestPath} pluginId must satisfy PLUG-ID-001`, manifestPath));
                continue;
            }
            const declaredFiles = yaml.files;
            if (!Array.isArray(declaredFiles) || declaredFiles.some((item) => typeof item !== 'string')) {
                errors.push((0, errors_1.makeError)('E_PLUGIN_KEYS_INVALID', `Plugin manifest ${manifestPath} files must be a list of strings`, manifestPath));
                continue;
            }
            const binaryFilesRaw = yaml.binaryFiles;
            let binaryFilesList = [];
            if (Object.prototype.hasOwnProperty.call(yaml, 'binaryFiles')) {
                if (!Array.isArray(binaryFilesRaw) || binaryFilesRaw.some((item) => typeof item !== 'string')) {
                    errors.push((0, errors_1.makeError)('E_PLUGIN_KEYS_INVALID', `Plugin manifest ${manifestPath} binaryFiles must be a list of strings`, manifestPath));
                    continue;
                }
                binaryFilesList = binaryFilesRaw;
            }
            let binaryFilesInvalid = false;
            for (const file of binaryFilesList) {
                if (!(0, pluginManifest_1.isSafeRelativePath)(file)) {
                    errors.push((0, errors_1.makeError)('E_PLUGIN_PATH_INVALID', `Plugin manifest ${manifestPath} binaryFiles entry "${file}" must be a safe relative path`, manifestPath));
                    binaryFilesInvalid = true;
                }
                if (!declaredFiles.includes(file)) {
                    errors.push((0, errors_1.makeError)('E_PLUGIN_KEYS_INVALID', `Plugin manifest ${manifestPath} binaryFiles entry "${file}" must be listed in files`, manifestPath));
                    binaryFilesInvalid = true;
                }
            }
            if (binaryFilesInvalid) {
                continue;
            }
            const binaryFiles = new Set(binaryFilesList);
            const raw = snapshot.files.get(manifestPath);
            if (!raw)
                continue;
            const decoded = (0, text_1.decodeUtf8Strict)(raw);
            if (!decoded.ok) {
                if (decoded.reason === 'no-decoder') {
                    errors.push((0, errors_1.makeError)('E_INTERNAL', 'TextDecoder not available for UTF-8 decode', manifestPath));
                }
                else {
                    errors.push((0, errors_1.makeError)('E_UTF8_INVALID', 'Invalid UTF-8 encoding', manifestPath));
                }
                continue;
            }
            const normalizedText = (0, text_1.normalizeLineEndings)(decoded.text);
            const identity = `plugin.${pluginId}`;
            if (seenIds.has(identity)) {
                errors.push((0, errors_1.makeError)('E_DUPLICATE_ID', `Duplicate identity detected during hashing: ${identity}`, manifestPath));
                continue;
            }
            seenIds.add(identity);
            const contentBytes = encoder.encode(normalizedText);
            const idBytes = encoder.encode(identity);
            entries.push({ id: identity, idBytes, file: manifestPath, bytes: contentBytes });
            pluginManifests.push({
                pluginId,
                manifestPath,
                declaredFiles,
                binaryFiles,
            });
        }
        for (const manifest of pluginManifests) {
            const manifestPath = manifest.manifestPath;
            const lastSlash = manifestPath.lastIndexOf('/');
            const manifestDir = lastSlash === -1 ? '' : manifestPath.slice(0, lastSlash);
            for (const relativePath of manifest.declaredFiles) {
                const identity = `plugin.${manifest.pluginId}/${relativePath}`;
                if (seenIds.has(identity)) {
                    errors.push((0, errors_1.makeError)('E_DUPLICATE_ID', `Duplicate identity detected during hashing: ${identity}`, manifestPath));
                    continue;
                }
                seenIds.add(identity);
                const resolvedPath = manifestDir ? `${manifestDir}/${relativePath}` : relativePath;
                const raw = snapshot.files.get(resolvedPath);
                if (!raw) {
                    errors.push((0, errors_1.makeError)('E_PLUGIN_FILE_MISSING', `Plugin bundle file missing: ${resolvedPath}`, manifestPath));
                    continue;
                }
                if (resolvedPath.startsWith('blocks/')) {
                    errors.push((0, errors_1.makeError)('E_PLUGIN_FILE_KIND_FORBIDDEN', 'Plugin bundle file must not be a block store file', resolvedPath));
                    continue;
                }
                let contentBytes;
                if (manifest.binaryFiles.has(relativePath)) {
                    contentBytes = raw;
                }
                else {
                    const decodedBundle = (0, text_1.decodeUtf8Strict)(raw);
                    if (!decodedBundle.ok) {
                        if (decodedBundle.reason === 'no-decoder') {
                            errors.push((0, errors_1.makeError)('E_INTERNAL', 'TextDecoder not available for UTF-8 decode', resolvedPath));
                        }
                        else {
                            errors.push((0, errors_1.makeError)('E_UTF8_INVALID', 'Invalid UTF-8 encoding', resolvedPath));
                        }
                        continue;
                    }
                    const normalizedBundle = (0, text_1.normalizeLineEndings)(decodedBundle.text);
                    contentBytes = encoder.encode(normalizedBundle);
                }
                const idBytes = encoder.encode(identity);
                entries.push({ id: identity, idBytes, file: resolvedPath, bytes: contentBytes });
            }
        }
    }
    if (errors.length) {
        return { ok: false, errors };
    }
    entries.sort((a, b) => lexCompareBytes(a.idBytes, b.idBytes));
    const hash = sha256_1.sha256.create();
    hash.update(encoder.encode('graphdown:gdhash:v1\0'));
    for (const entry of entries) {
        hash.update(entry.idBytes);
        hash.update(Uint8Array.of(0));
        hash.update(encoder.encode(String(entry.bytes.length)));
        hash.update(Uint8Array.of(0));
        hash.update(entry.bytes);
        hash.update(Uint8Array.of(0));
    }
    const digestBytes = hash.digest();
    const cidBytes = Uint8Array.of(0x01, 0x55, 0x12, 0x20, ...digestBytes);
    const cid = `b${(0, base32_1.encodeBase32)(cidBytes)}`;
    return { ok: true, cid };
}
