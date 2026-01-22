"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateDatasetSnapshot = validateDatasetSnapshot;
const datasetObjects_1 = require("../parse/datasetObjects");
const pluginManifest_1 = require("../parse/pluginManifest");
const pluginObjects_1 = require("../parse/pluginObjects");
const sha256_1 = require("@noble/hashes/sha256");
const errors_1 = require("./errors");
const types_1 = require("../model/types");
const daslCid_1 = require("../cid/daslCid");
const wikiRefs_1 = require("../parse/wikiRefs");
const ids_1 = require("../model/ids");
const text_1 = require("../internal/text");
const collectStringValues_1 = require("../internal/collectStringValues");
const SAMPLE_LIMIT = 10;
function enforceFieldDefs(typeObj, records, errors) {
    const fieldDefsRaw = typeObj.fields.fieldDefs;
    if (fieldDefsRaw === undefined) {
        return;
    }
    if (!(0, types_1.isObject)(fieldDefsRaw)) {
        errors.push((0, errors_1.makeError)('E_REQUIRED_FIELD_MISSING', `Type ${typeObj.typeId} fields.fieldDefs must be a map keyed by field name`, typeObj.file));
        return;
    }
    const requiredFields = [];
    for (const [fieldName, def] of Object.entries(fieldDefsRaw)) {
        if (!(0, types_1.isObject)(def)) {
            errors.push((0, errors_1.makeError)('E_REQUIRED_FIELD_MISSING', `Type ${typeObj.typeId} fields.fieldDefs.${fieldName} must be an object`, typeObj.file));
            continue;
        }
        if ('required' in def && typeof def.required !== 'boolean') {
            errors.push((0, errors_1.makeError)('E_REQUIRED_FIELD_MISSING', `Type ${typeObj.typeId} fields.fieldDefs.${fieldName}.required must be boolean when present`, typeObj.file));
        }
        if (def.required === true) {
            requiredFields.push(fieldName);
        }
    }
    if (requiredFields.length === 0) {
        return;
    }
    for (const record of records) {
        for (const fieldName of requiredFields) {
            const value = record.fields[fieldName];
            const missing = value === undefined ||
                value === null ||
                (typeof value === 'string' && value.trim().length === 0);
            if (missing) {
                errors.push((0, errors_1.makeError)('E_REQUIRED_FIELD_MISSING', `Record ${record.identity} is missing required field "${fieldName}"`, record.file));
            }
        }
    }
}
function enforceCompositionShape(typeObj, errors) {
    const compositionRaw = typeObj.fields.composition;
    if (compositionRaw === undefined) {
        return [];
    }
    if (!(0, types_1.isObject)(compositionRaw)) {
        errors.push((0, errors_1.makeError)('E_COMPOSITION_SCHEMA_INVALID', `Type ${typeObj.typeId} fields.composition must be a map keyed by component name.`, typeObj.file));
        return [];
    }
    const components = [];
    for (const [name, value] of Object.entries(compositionRaw)) {
        if (!(0, types_1.isObject)(value) || Array.isArray(value)) {
            errors.push((0, errors_1.makeError)('E_COMPOSITION_SCHEMA_INVALID', `Type ${typeObj.typeId} composition.${name} must be an object.`, typeObj.file));
            continue;
        }
        const typeId = value.typeId;
        if (typeof typeId !== 'string' || !datasetObjects_1.IDENTIFIER_PATTERN.test(typeId)) {
            errors.push((0, errors_1.makeError)('E_COMPOSITION_SCHEMA_INVALID', `Type ${typeObj.typeId} composition.${name}.typeId must satisfy ID-001`, typeObj.file));
            continue;
        }
        if (!Object.prototype.hasOwnProperty.call(value, 'required')) {
            errors.push((0, errors_1.makeError)('E_COMPOSITION_SCHEMA_INVALID', `Type ${typeObj.typeId} composition.${name} must define required: boolean`, typeObj.file));
            continue;
        }
        if (typeof value.required !== 'boolean') {
            errors.push((0, errors_1.makeError)('E_COMPOSITION_SCHEMA_INVALID', `Type ${typeObj.typeId} composition.${name}.required must be boolean`, typeObj.file));
            continue;
        }
        const allowedKeys = new Set(['typeId', 'required']);
        const extra = Object.keys(value).find((k) => !allowedKeys.has(k));
        if (extra) {
            errors.push((0, errors_1.makeError)('E_COMPOSITION_SCHEMA_INVALID', `Type ${typeObj.typeId} composition.${name} contains forbidden key "${extra}"`, typeObj.file));
            continue;
        }
        components.push({ typeId, required: value.required === true });
    }
    return components;
}
function validateBlockStore(snapshot, records, types, errors) {
    const blockFiles = [...snapshot.files.keys()].filter((p) => p.startsWith('blocks/'));
    for (const path of blockFiles) {
        if (!path.startsWith('blocks/sha2-256/')) {
            errors.push((0, errors_1.makeError)('E_BLOCK_PATH_INVALID', `Invalid block path ${path}`, path));
            continue;
        }
        const parts = path.split('/');
        if (parts.length !== 4) {
            errors.push((0, errors_1.makeError)('E_BLOCK_PATH_INVALID', `Invalid block path ${path}`, path));
            continue;
        }
        const [, algo, prefix, cid] = parts;
        if (algo !== 'sha2-256') {
            errors.push((0, errors_1.makeError)('E_BLOCK_PATH_INVALID', `Invalid block algorithm segment in ${path}`, path));
            continue;
        }
        if (!/^[0-9a-f]{2}$/.test(prefix)) {
            errors.push((0, errors_1.makeError)('E_BLOCK_PATH_INVALID', `Invalid block prefix ${prefix} in ${path}`, path));
            continue;
        }
        let decoded;
        try {
            decoded = (0, daslCid_1.decodeDaslCidString)(cid);
        }
        catch {
            errors.push((0, errors_1.makeError)('E_BLOCK_PATH_INVALID', `Invalid CID in block path ${path}`, path));
            continue;
        }
        if ((0, daslCid_1.blockPathForCid)(cid) !== path) {
            errors.push((0, errors_1.makeError)('E_BLOCK_PATH_INVALID', `Block path ${path} is not canonical`, path));
            continue;
        }
        const bytes = snapshot.files.get(path);
        if (!bytes) {
            continue;
        }
        const digest = (0, sha256_1.sha256)(bytes);
        if (digest.length !== decoded.digest.length) {
            errors.push((0, errors_1.makeError)('E_BLOCK_DIGEST_MISMATCH', `Block file ${path} digest does not match its CID`, path));
            continue;
        }
        for (let i = 0; i < digest.length; i += 1) {
            if (digest[i] !== decoded.digest[i]) {
                errors.push((0, errors_1.makeError)('E_BLOCK_DIGEST_MISMATCH', `Block file ${path} digest does not match its CID`, path));
                break;
            }
        }
    }
    for (const record of records) {
        const strings = new Set();
        (0, collectStringValues_1.collectStringValues)(record.fields, strings);
        (0, collectStringValues_1.collectStringValues)(record.body, strings);
        for (const value of strings) {
            const { cids, invalidCidTokens } = (0, wikiRefs_1.extractCidRefs)(value);
            for (const token of invalidCidTokens) {
                errors.push((0, errors_1.makeError)('E_CID_INVALID', `Invalid CID reference ${token}`, record.file));
            }
            for (const cid of cids) {
                const path = (0, daslCid_1.blockPathForCid)(cid);
                if (!snapshot.files.has(path)) {
                    errors.push((0, errors_1.makeError)('E_BLOCK_REFERENCE_MISSING', `Block ${cid} referenced from ${record.identity} is missing`, record.file));
                }
            }
        }
    }
    for (const type of types) {
        const strings = new Set();
        (0, collectStringValues_1.collectStringValues)(type.fields, strings);
        (0, collectStringValues_1.collectStringValues)(type.body, strings);
        for (const value of strings) {
            const { cids, invalidCidTokens } = (0, wikiRefs_1.extractCidRefs)(value);
            for (const token of invalidCidTokens) {
                errors.push((0, errors_1.makeError)('E_CID_INVALID', `Invalid CID reference ${token}`, type.file));
            }
            for (const cid of cids) {
                const path = (0, daslCid_1.blockPathForCid)(cid);
                if (!snapshot.files.has(path)) {
                    errors.push((0, errors_1.makeError)('E_BLOCK_REFERENCE_MISSING', `Block ${cid} referenced from type ${type.typeId} is missing`, type.file));
                }
            }
        }
    }
    // Referenced blocks used for GC/export; no validity failure for garbage blocks.
}
function collectRecordRefsFromRecord(record) {
    const refs = new Set();
    const strings = new Set();
    (0, collectStringValues_1.collectStringValues)(record.fields, strings);
    (0, collectStringValues_1.collectStringValues)(record.body, strings);
    for (const value of strings) {
        for (const ref of (0, wikiRefs_1.extractRecordRefs)(value)) {
            refs.add(ref);
        }
    }
    return refs;
}
function validateDatasetSnapshot(snapshot) {
    const errors = [];
    const parsed = (0, datasetObjects_1.discoverGraphdownObjects)(snapshot);
    if (parsed.errors.length) {
        errors.push(...parsed.errors);
    }
    const definedTypeIds = new Set([
        ...parsed.typeObjects.map((typeObj) => typeObj.typeId),
        ...parsed.declaredTypeIds
    ]);
    const discovered = (0, pluginObjects_1.discoverPluginObjects)(snapshot);
    const pluginManifests = discovered.plugins.map((p) => p.manifest);
    const pluginManifestPaths = discovered.pluginManifestPaths;
    const recordFilePaths = new Set([
        ...parsed.typeObjects.map((obj) => obj.file),
        ...parsed.recordObjects.map((obj) => obj.file),
    ]);
    const requiredKeys = ['pluginId', 'gdApiVersion', 'entry', 'files'];
    const optionalKeys = ['meta', 'config', 'requires', 'blocks', 'binaryFiles'];
    const forbiddenKeys = ['typeId', 'recordId', 'parent', 'fields'];
    const allowedKeys = new Set([...requiredKeys, ...optionalKeys]);
    for (const manifest of pluginManifests) {
        const yaml = manifest.yaml;
        const missing = requiredKeys.filter((key) => !Object.prototype.hasOwnProperty.call(yaml, key));
        if (missing.length > 0) {
            errors.push((0, errors_1.makeError)('E_PLUGIN_KEYS_INVALID', `Plugin manifest ${manifest.file} is missing required keys: ${missing.join(', ')}`, manifest.file));
        }
        const forbidden = forbiddenKeys.filter((key) => Object.prototype.hasOwnProperty.call(yaml, key));
        if (forbidden.length > 0) {
            errors.push((0, errors_1.makeError)('E_PLUGIN_KEYS_INVALID', `Plugin manifest ${manifest.file} contains forbidden keys: ${forbidden.join(', ')}`, manifest.file));
        }
        for (const key of Object.keys(yaml)) {
            if (!allowedKeys.has(key)) {
                errors.push((0, errors_1.makeError)('E_PLUGIN_KEYS_INVALID', `Plugin manifest ${manifest.file} contains unknown key "${key}"`, manifest.file));
            }
        }
        const pluginId = yaml.pluginId;
        if (typeof pluginId !== 'string' || !(0, ids_1.isValidPluginId)(pluginId)) {
            errors.push((0, errors_1.makeError)('E_PLUGIN_KEYS_INVALID', `Plugin manifest ${manifest.file} pluginId must satisfy PLUG-ID-001`, manifest.file));
        }
        const gdApiVersion = yaml.gdApiVersion;
        if (typeof gdApiVersion !== 'number' || !Number.isInteger(gdApiVersion) || gdApiVersion < 1) {
            errors.push((0, errors_1.makeError)('E_PLUGIN_KEYS_INVALID', `Plugin manifest ${manifest.file} gdApiVersion must be an integer >= 1`, manifest.file));
        }
        const entry = yaml.entry;
        if (typeof entry !== 'string') {
            errors.push((0, errors_1.makeError)('E_PLUGIN_KEYS_INVALID', `Plugin manifest ${manifest.file} entry must be a string`, manifest.file));
        }
        const files = yaml.files;
        if (!Array.isArray(files) || files.some((item) => typeof item !== 'string')) {
            errors.push((0, errors_1.makeError)('E_PLUGIN_KEYS_INVALID', `Plugin manifest ${manifest.file} files must be a list of strings`, manifest.file));
        }
        if (Object.prototype.hasOwnProperty.call(yaml, 'meta') && !(0, types_1.isObject)(yaml.meta)) {
            errors.push((0, errors_1.makeError)('E_PLUGIN_KEYS_INVALID', `Plugin manifest ${manifest.file} meta must be an object`, manifest.file));
        }
        if (Object.prototype.hasOwnProperty.call(yaml, 'config') && !(0, types_1.isObject)(yaml.config)) {
            errors.push((0, errors_1.makeError)('E_PLUGIN_KEYS_INVALID', `Plugin manifest ${manifest.file} config must be an object`, manifest.file));
        }
        if (Object.prototype.hasOwnProperty.call(yaml, 'requires') &&
            (!Array.isArray(yaml.requires) || yaml.requires.some((item) => typeof item !== 'string'))) {
            errors.push((0, errors_1.makeError)('E_PLUGIN_KEYS_INVALID', `Plugin manifest ${manifest.file} requires must be a list of strings`, manifest.file));
        }
        if (Object.prototype.hasOwnProperty.call(yaml, 'blocks') && !Array.isArray(yaml.blocks)) {
            errors.push((0, errors_1.makeError)('E_PLUGIN_KEYS_INVALID', `Plugin manifest ${manifest.file} blocks must be an array`, manifest.file));
        }
        if (Object.prototype.hasOwnProperty.call(yaml, 'binaryFiles') &&
            (!Array.isArray(yaml.binaryFiles) || yaml.binaryFiles.some((item) => typeof item !== 'string'))) {
            errors.push((0, errors_1.makeError)('E_PLUGIN_KEYS_INVALID', `Plugin manifest ${manifest.file} binaryFiles must be a list of strings`, manifest.file));
        }
    }
    const pluginIdToManifestPath = new Map();
    for (const manifest of pluginManifests) {
        const pluginId = manifest.yaml.pluginId;
        if (typeof pluginId !== 'string' || !(0, ids_1.isValidPluginId)(pluginId)) {
            continue;
        }
        const existing = pluginIdToManifestPath.get(pluginId);
        if (existing) {
            errors.push((0, errors_1.makeError)('E_PLUGIN_DUPLICATE_ID', `Duplicate pluginId ${pluginId} found in ${existing} and ${manifest.file}`, manifest.file));
            continue;
        }
        pluginIdToManifestPath.set(pluginId, manifest.file);
    }
    for (const manifest of pluginManifests) {
        const entry = manifest.yaml.entry;
        const files = manifest.yaml.files;
        if (typeof entry === 'string' && Array.isArray(files) && files.every((item) => typeof item === 'string')) {
            if (entry.trim().length === 0 || !(0, pluginManifest_1.isSafeRelativePath)(entry) || !files.includes(entry)) {
                errors.push((0, errors_1.makeError)('E_PLUGIN_ENTRY_INVALID', `Plugin manifest ${manifest.file} entry "${entry}" must be a safe relative path and listed in files`, manifest.file));
            }
        }
    }
    for (const manifest of pluginManifests) {
        const files = manifest.yaml.files;
        if (!Array.isArray(files) || files.some((item) => typeof item !== 'string')) {
            continue;
        }
        const binaryFilesRaw = manifest.yaml.binaryFiles;
        const binaryFiles = Array.isArray(binaryFilesRaw) && binaryFilesRaw.every((item) => typeof item === 'string')
            ? binaryFilesRaw
            : [];
        const binaryFileSet = new Set(binaryFiles);
        for (const file of binaryFiles) {
            if (!(0, pluginManifest_1.isSafeRelativePath)(file)) {
                errors.push((0, errors_1.makeError)('E_PLUGIN_PATH_INVALID', `Plugin manifest ${manifest.file} binary file path "${file}" is not a safe relative path`, manifest.file));
            }
            if (!files.includes(file)) {
                errors.push((0, errors_1.makeError)('E_PLUGIN_KEYS_INVALID', `Plugin manifest ${manifest.file} binaryFiles entry "${file}" must be listed in files`, manifest.file));
            }
        }
        if (files.includes('manifest.md')) {
            errors.push((0, errors_1.makeError)('E_PLUGIN_PATH_RESERVED', `Plugin manifest ${manifest.file} files must not include reserved path manifest.md`, manifest.file));
        }
        const seenFiles = new Set();
        let hasDuplicates = false;
        for (const file of files) {
            if (seenFiles.has(file)) {
                hasDuplicates = true;
            }
            else {
                seenFiles.add(file);
            }
        }
        if (hasDuplicates) {
            errors.push((0, errors_1.makeError)('E_PLUGIN_FILES_DUPLICATE', `Plugin manifest ${manifest.file} files list contains duplicates`, manifest.file));
        }
        for (const file of files) {
            if (!(0, pluginManifest_1.isSafeRelativePath)(file)) {
                errors.push((0, errors_1.makeError)('E_PLUGIN_PATH_INVALID', `Plugin manifest ${manifest.file} file path "${file}" is not a safe relative path`, manifest.file));
            }
        }
        const resolved = (0, pluginManifest_1.resolvePluginBundlePaths)(manifest.file, files);
        const resolvedToRelative = new Map();
        for (const file of files) {
            const resolvedPath = resolved.get(file);
            if (!resolvedPath) {
                continue;
            }
            const existing = resolvedToRelative.get(resolvedPath);
            if (existing && existing !== file) {
                errors.push((0, errors_1.makeError)('E_PLUGIN_FILES_DUPLICATE', `Plugin manifest ${manifest.file} entries "${existing}" and "${file}" resolve to the same path ${resolvedPath}`, manifest.file));
            }
            else {
                resolvedToRelative.set(resolvedPath, file);
            }
        }
        for (const file of files) {
            const resolvedPath = resolved.get(file);
            if (!resolvedPath) {
                continue;
            }
            if (!snapshot.files.has(resolvedPath)) {
                errors.push((0, errors_1.makeError)('E_PLUGIN_FILE_MISSING', `Plugin manifest ${manifest.file} references missing file ${resolvedPath}`, manifest.file));
                continue;
            }
            if (recordFilePaths.has(resolvedPath) ||
                resolvedPath.startsWith('blocks/') ||
                pluginManifestPaths.has(resolvedPath)) {
                errors.push((0, errors_1.makeError)('E_PLUGIN_FILE_KIND_FORBIDDEN', `Plugin manifest ${manifest.file} references forbidden file ${resolvedPath}`, manifest.file));
            }
        }
        for (const file of files) {
            const resolvedPath = resolved.get(file);
            if (!resolvedPath) {
                continue;
            }
            const bytes = snapshot.files.get(resolvedPath);
            if (!bytes) {
                continue;
            }
            if (binaryFileSet.has(file)) {
                continue;
            }
            const decodedBundle = (0, text_1.decodeUtf8Strict)(bytes);
            if (!decodedBundle.ok) {
                errors.push((0, errors_1.makeError)('E_PLUGIN_UTF8_INVALID', `Plugin manifest ${manifest.file} file ${resolvedPath} is not valid UTF-8`, manifest.file));
            }
        }
    }
    for (const manifest of pluginManifests) {
        if (!Object.prototype.hasOwnProperty.call(manifest.yaml, 'blocks')) {
            continue;
        }
        const blocks = manifest.yaml.blocks;
        if (!Array.isArray(blocks)) {
            errors.push((0, errors_1.makeError)('E_PLUGIN_BLOCK_CID_INVALID', `Plugin manifest ${manifest.file} blocks must be a list of CID strings`, manifest.file));
            continue;
        }
        const decodedBlocks = [];
        for (const cid of blocks) {
            if (typeof cid !== 'string') {
                errors.push((0, errors_1.makeError)('E_PLUGIN_BLOCK_CID_INVALID', `Plugin manifest ${manifest.file} blocks must contain only CID strings`, manifest.file));
                continue;
            }
            try {
                const decoded = (0, daslCid_1.decodeDaslCidString)(cid);
                decodedBlocks.push({ cid, digest: decoded.digest });
            }
            catch {
                errors.push((0, errors_1.makeError)('E_PLUGIN_BLOCK_CID_INVALID', `Plugin manifest ${manifest.file} blocks contains invalid CID ${cid}`, manifest.file));
            }
        }
        for (const { cid, digest } of decodedBlocks) {
            const path = (0, daslCid_1.blockPathForCid)(cid);
            const bytes = snapshot.files.get(path);
            if (!bytes) {
                errors.push((0, errors_1.makeError)('E_PLUGIN_BLOCK_MISSING_OR_INVALID', `Plugin manifest ${manifest.file} references missing block ${cid}`, manifest.file));
                continue;
            }
            const actual = (0, sha256_1.sha256)(bytes);
            if (actual.length !== digest.length) {
                errors.push((0, errors_1.makeError)('E_PLUGIN_BLOCK_MISSING_OR_INVALID', `Plugin manifest ${manifest.file} references block ${cid} with mismatched digest`, manifest.file));
                continue;
            }
            for (let i = 0; i < actual.length; i += 1) {
                if (actual[i] !== digest[i]) {
                    errors.push((0, errors_1.makeError)('E_PLUGIN_BLOCK_MISSING_OR_INVALID', `Plugin manifest ${manifest.file} references block ${cid} with mismatched digest`, manifest.file));
                    break;
                }
            }
        }
    }
    const typesById = new Map();
    for (const typeObj of parsed.typeObjects) {
        if (typesById.has(typeObj.typeId)) {
            errors.push((0, errors_1.makeError)('E_DUPLICATE_ID', `Duplicate typeId ${typeObj.typeId}`, typeObj.file));
        }
        else {
            typesById.set(typeObj.typeId, typeObj);
        }
    }
    const recordsByKey = new Map();
    const recordsByTypeId = new Map();
    for (const record of parsed.recordObjects) {
        if (recordsByKey.has(record.identity)) {
            errors.push((0, errors_1.makeError)('E_DUPLICATE_ID', `Duplicate record identity ${record.identity}`, record.file));
        }
        else {
            recordsByKey.set(record.identity, record);
        }
        const list = recordsByTypeId.get(record.typeId) ?? [];
        list.push(record);
        recordsByTypeId.set(record.typeId, list);
    }
    const missingTypeRefs = new Map();
    for (const record of parsed.recordObjects) {
        if (definedTypeIds.has(record.typeId)) {
            continue;
        }
        const list = missingTypeRefs.get(record.typeId) ?? [];
        list.push(record.file);
        missingTypeRefs.set(record.typeId, list);
    }
    for (const [typeId, files] of missingTypeRefs) {
        const sample = files.slice(0, SAMPLE_LIMIT);
        const extra = files.length - sample.length;
        const sampleSuffix = extra > 0 ? ` (+${extra} more)` : '';
        const hint = [
            `This type is referenced by ${files.length} record(s).`,
            sample.length > 0 ? `Sample: ${sample.join(', ')}${sampleSuffix}.` : null,
            `Fix: create types/${typeId}.md, or change those records' typeId to an existing type.`
        ]
            .filter(Boolean)
            .join(' ');
        errors.push((0, errors_1.makeError)('E_UNKNOWN_TYPE', `Unknown record type "${typeId}". No type definition found at types/${typeId}.md.`, undefined, hint));
    }
    for (const record of parsed.recordObjects) {
        if (typeof record.parent === 'string' && !recordsByKey.has(record.parent)) {
            errors.push((0, errors_1.makeError)('E_PARENT_MISSING', `Record ${record.identity} parent ${record.parent} does not exist`, record.file));
        }
    }
    const parentState = new Map();
    const visitParent = (recordKey, stack) => {
        const state = parentState.get(recordKey) ?? 0;
        if (state === 1) {
            const cycleStartIndex = stack.indexOf(recordKey);
            const cyclePath = cycleStartIndex >= 0 ? stack.slice(cycleStartIndex).concat(recordKey) : stack.concat(recordKey);
            const file = recordsByKey.get(recordKey)?.file;
            if (file) {
                errors.push((0, errors_1.makeError)('E_PARENT_CYCLE', `Parent pointer cycle detected: ${cyclePath.join(' -> ')}`, file));
            }
            return;
        }
        if (state === 2) {
            return;
        }
        parentState.set(recordKey, 1);
        const record = recordsByKey.get(recordKey);
        if (record && typeof record.parent === 'string') {
            const parentKey = record.parent;
            if (parentKey === recordKey) {
                errors.push((0, errors_1.makeError)('E_PARENT_CYCLE', `Parent pointer cycle detected: ${recordKey} -> ${recordKey}`, record.file));
            }
            else if (recordsByKey.has(parentKey)) {
                visitParent(parentKey, [...stack, recordKey]);
            }
        }
        parentState.set(recordKey, 2);
    };
    for (const record of parsed.recordObjects) {
        if ((parentState.get(record.identity) ?? 0) === 0) {
            visitParent(record.identity, []);
        }
    }
    for (const typeObj of parsed.typeObjects) {
        const records = recordsByTypeId.get(typeObj.typeId) ?? [];
        enforceFieldDefs(typeObj, records, errors);
        const components = enforceCompositionShape(typeObj, errors);
        for (const component of components) {
            if (!typesById.has(component.typeId)) {
                errors.push((0, errors_1.makeError)('E_COMPOSITION_UNKNOWN_TYPE', `Type ${typeObj.typeId} composition references missing typeId ${component.typeId}`, typeObj.file));
                continue;
            }
            if (!component.required) {
                continue;
            }
            for (const record of records) {
                const refs = collectRecordRefsFromRecord(record);
                const matches = [...refs].filter((ref) => recordsByKey.has(ref) && recordsByKey.get(ref).typeId === component.typeId);
                if (matches.length === 0) {
                    errors.push((0, errors_1.makeError)('E_COMPOSITION_CONSTRAINT_VIOLATION', `Record ${record.identity} must link to at least one ${component.typeId} to satisfy composition "${component.typeId}"`, record.file));
                }
            }
        }
    }
    validateBlockStore(snapshot, parsed.recordObjects, parsed.typeObjects, errors);
    if (errors.length) {
        return { ok: false, errors };
    }
    return { ok: true };
}
