"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canonicalizeDatasetSnapshot = canonicalizeDatasetSnapshot;
const datasetObjects_1 = require("../parse/datasetObjects");
const daslCid_1 = require("../cid/daslCid");
const wikiRefs_1 = require("../parse/wikiRefs");
const pluginObjects_1 = require("../parse/pluginObjects");
const ids_1 = require("../model/ids");
const collectStringValues_1 = require("../internal/collectStringValues");
function collectReachableBlockPaths(snapshot, recordObjects, typeObjects) {
    const cids = new Set();
    for (const record of recordObjects) {
        const strings = new Set();
        (0, collectStringValues_1.collectStringValues)(record.fields, strings);
        (0, collectStringValues_1.collectStringValues)(record.body, strings);
        for (const value of strings) {
            const { cids: foundCids, invalidCidTokens } = (0, wikiRefs_1.extractCidRefs)(value);
            if (invalidCidTokens.length > 0) {
                throw new Error('Canonicalization requires validated CID references');
            }
            for (const cid of foundCids) {
                cids.add(cid);
            }
        }
    }
    for (const type of typeObjects) {
        const strings = new Set();
        (0, collectStringValues_1.collectStringValues)(type.fields, strings);
        (0, collectStringValues_1.collectStringValues)(type.body, strings);
        for (const value of strings) {
            const { cids: foundCids, invalidCidTokens } = (0, wikiRefs_1.extractCidRefs)(value);
            if (invalidCidTokens.length > 0) {
                throw new Error('Canonicalization requires validated CID references');
            }
            for (const cid of foundCids) {
                cids.add(cid);
            }
        }
    }
    const discovered = (0, pluginObjects_1.discoverPluginObjects)(snapshot);
    for (const plugin of discovered.plugins) {
        const blocks = plugin.manifest.yaml.blocks;
        if (blocks === undefined) {
            continue;
        }
        if (!Array.isArray(blocks) || blocks.some((item) => typeof item !== 'string')) {
            throw new Error('Canonicalization requires validated plugin manifests');
        }
        for (const cid of blocks) {
            cids.add(cid);
        }
    }
    const paths = new Set();
    for (const cid of cids) {
        const path = (0, daslCid_1.blockPathForCid)(cid);
        if (snapshot.files.has(path)) {
            paths.add(path);
        }
    }
    return paths;
}
function canonicalizeDatasetSnapshot(snapshot) {
    const parsed = (0, datasetObjects_1.discoverGraphdownObjects)(snapshot);
    const outputFiles = new Map();
    for (const typeObj of parsed.typeObjects) {
        const bytes = snapshot.files.get(typeObj.file);
        if (!bytes) {
            continue;
        }
        outputFiles.set(`types/${typeObj.typeId}.md`, bytes);
    }
    const recordsByKey = new Map(parsed.recordObjects.map((record) => [record.identity, record]));
    const dirMemo = new Map();
    const visiting = new Set();
    const resolveRecordDir = (recordKey) => {
        const cached = dirMemo.get(recordKey);
        if (cached) {
            return cached;
        }
        const record = recordsByKey.get(recordKey);
        if (!record) {
            throw new Error(`Missing record for key ${recordKey}`);
        }
        if (visiting.has(recordKey)) {
            throw new Error(`Parent cycle detected at ${recordKey}`);
        }
        visiting.add(recordKey);
        const ownDir = `records/${record.typeId}.${record.recordId}`;
        let fullDir = ownDir;
        if (typeof record.parent === 'string') {
            const parentDir = resolveRecordDir(record.parent);
            fullDir = `${parentDir}/${record.typeId}.${record.recordId}`;
        }
        visiting.delete(recordKey);
        dirMemo.set(recordKey, fullDir);
        return fullDir;
    };
    for (const recordObj of parsed.recordObjects) {
        const bytes = snapshot.files.get(recordObj.file);
        if (!bytes) {
            continue;
        }
        const recordDir = resolveRecordDir(recordObj.identity);
        outputFiles.set(`${recordDir}/${recordObj.recordId}.md`, bytes);
    }
    // --- Plugins: canonical export layout (EXP-PLUG-001) ---
    const discovered = (0, pluginObjects_1.discoverPluginObjects)(snapshot);
    for (const plugin of discovered.plugins) {
        const path = plugin.manifest.file;
        const bytes = snapshot.files.get(path);
        if (!bytes)
            continue;
        const yaml = plugin.manifest.yaml;
        const pluginId = yaml.pluginId;
        const files = yaml.files;
        if (typeof pluginId !== 'string' || !(0, ids_1.isValidPluginId)(pluginId)) {
            throw new Error('Canonicalization requires validated plugin manifests');
        }
        if (!Array.isArray(files) || files.some((item) => typeof item !== 'string')) {
            throw new Error('Canonicalization requires validated plugin manifests');
        }
        const pluginRoot = `plugins/${pluginId}`;
        const manifestDest = `${pluginRoot}/manifest.md`;
        if (outputFiles.has(manifestDest)) {
            throw new Error(`Duplicate plugin export path ${manifestDest}`);
        }
        outputFiles.set(manifestDest, bytes);
        for (const rel of files) {
            const resolvedPath = plugin.resolvedFiles.get(rel);
            if (!resolvedPath) {
                throw new Error('Canonicalization requires validated plugin manifests');
            }
            const bundleBytes = snapshot.files.get(resolvedPath);
            if (!bundleBytes) {
                throw new Error('Canonicalization requires validated plugin manifests');
            }
            const bundleDest = `${pluginRoot}/${rel}`;
            if (outputFiles.has(bundleDest)) {
                throw new Error(`Duplicate plugin export path ${bundleDest}`);
            }
            outputFiles.set(bundleDest, bundleBytes);
        }
    }
    const blockPaths = collectReachableBlockPaths(snapshot, parsed.recordObjects, parsed.typeObjects);
    for (const blockPath of blockPaths) {
        const bytes = snapshot.files.get(blockPath);
        if (bytes) {
            outputFiles.set(blockPath, bytes);
        }
    }
    return { files: outputFiles };
}
