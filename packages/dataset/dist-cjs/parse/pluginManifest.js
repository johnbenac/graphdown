"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePluginManifest = parsePluginManifest;
exports.isSafeRelativePath = isSafeRelativePath;
exports.collectDeclaredPluginBundleRelPaths = collectDeclaredPluginBundleRelPaths;
exports.resolvePluginBundlePaths = resolvePluginBundlePaths;
exports.isPluginManifestCandidateBytes = isPluginManifestCandidateBytes;
const markdownRecord_1 = require("./markdownRecord");
const text_1 = require("../internal/text");
const recordFile_1 = require("./recordFile");
function parsePluginManifest(text, filePath) {
    const parsed = (0, markdownRecord_1.parseMarkdownRecord)(text, filePath);
    if (!parsed.ok) {
        return { ok: false, error: parsed.error };
    }
    return {
        ok: true,
        manifest: {
            file: filePath,
            yaml: parsed.yaml,
            body: parsed.body,
        },
    };
}
function isSafeRelativePath(p) {
    if (typeof p !== 'string')
        return false;
    if (p.trim().length === 0)
        return false;
    if (p !== p.trim())
        return false;
    if (p.startsWith('/'))
        return false;
    if (p.startsWith('./'))
        return false;
    if (p.includes('\0'))
        return false;
    if (p.includes('\\'))
        return false;
    const segments = p.split('/');
    if (segments.length === 0)
        return false;
    for (const seg of segments) {
        if (!seg)
            return false;
        if (seg === '.')
            return false;
        if (seg === '..')
            return false;
    }
    return true;
}
function collectDeclaredPluginBundleRelPaths(yaml, manifestPath) {
    const declared = [];
    const seen = new Set();
    const addPath = (value, field) => {
        if (!isSafeRelativePath(value)) {
            throw new Error(`Plugin manifest ${manifestPath} has invalid ${field}: expected safe relative path`);
        }
        if (seen.has(value)) {
            return;
        }
        seen.add(value);
        declared.push(value);
    };
    const addStringArray = (value, field) => {
        if (!Array.isArray(value)) {
            throw new Error(`Plugin manifest ${manifestPath} has invalid ${field}: expected string[]`);
        }
        for (const entry of value) {
            if (typeof entry !== 'string') {
                throw new Error(`Plugin manifest ${manifestPath} has invalid ${field}: expected string[]`);
            }
            addPath(entry, field);
        }
    };
    if (Object.prototype.hasOwnProperty.call(yaml, 'entry')) {
        const entry = yaml.entry;
        if (typeof entry !== 'string') {
            throw new Error(`Plugin manifest ${manifestPath} has invalid entry: expected string`);
        }
        addPath(entry, 'entry');
    }
    if (Object.prototype.hasOwnProperty.call(yaml, 'files')) {
        addStringArray(yaml.files, 'files');
    }
    if (Object.prototype.hasOwnProperty.call(yaml, 'binaryFiles')) {
        addStringArray(yaml.binaryFiles, 'binaryFiles');
    }
    return declared;
}
function resolvePluginBundlePaths(manifestPath, files) {
    const normalizedManifestPath = manifestPath.replace(/\\/g, '/');
    const lastSlash = normalizedManifestPath.lastIndexOf('/');
    const manifestDir = lastSlash === -1 ? '' : normalizedManifestPath.slice(0, lastSlash);
    const resolved = new Map();
    for (const p of files) {
        const resolvedPath = manifestDir ? `${manifestDir}/${p}` : p;
        resolved.set(p, resolvedPath);
    }
    return resolved;
}
function isPluginManifestCandidateBytes(path, bytes) {
    if (!(0, recordFile_1.isRecordFileBytes)(path, bytes))
        return false;
    const decoded = (0, text_1.decodeUtf8Strict)(bytes);
    if (!decoded.ok)
        return false;
    const text = decoded.text;
    const parsed = parsePluginManifest(text, path);
    if (!parsed.ok)
        return false;
    const yaml = parsed.manifest.yaml;
    if (Object.prototype.hasOwnProperty.call(yaml, 'typeId'))
        return false;
    const hasPluginId = Object.prototype.hasOwnProperty.call(yaml, 'pluginId');
    const hasApiVersion = Object.prototype.hasOwnProperty.call(yaml, 'gdApiVersion');
    return hasPluginId && hasApiVersion;
}
