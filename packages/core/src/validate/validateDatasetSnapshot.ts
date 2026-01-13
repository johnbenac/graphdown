import {
  discoverGraphdownObjects,
  IDENTIFIER_PATTERN,
  type ParsedRecordObject,
  type ParsedTypeObject,
} from '../parse/datasetObjects';
import { sha256 } from '@noble/hashes/sha256';
import { makeError, type ValidationError } from './errors';
import type { DatasetSnapshot } from '../model/snapshotTypes';
import { isObject } from '../model/types';
import { blockPathForCid, decodeDaslCidString } from '../cid/daslCid';
import { extractCidRefs, extractRecordRefs } from '../parse/wikiRefs';
import {
  isPluginManifestCandidateBytes,
  isSafeRelativePath,
  parsePluginManifest,
  resolvePluginBundlePaths,
  type ParsedPluginManifest,
} from '../parse/pluginManifest';
import { isValidPluginId } from '../model/ids';

export type ValidateDatasetResult =
  | { ok: true }
  | { ok: false; errors: ValidationError[] };

type CompositionComponent = { typeId: string; required: boolean };

function collectStringValues(value: unknown, into: Set<string>): void {
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
  if (isObject(value)) {
    for (const child of Object.values(value)) {
      collectStringValues(child, into);
    }
  }
}

function enforceFieldDefs(
  typeObj: ParsedTypeObject,
  records: ParsedRecordObject[],
  errors: ValidationError[]
): void {
  const fieldDefsRaw = (typeObj.fields as Record<string, unknown>).fieldDefs;
  if (fieldDefsRaw === undefined) {
    return;
  }
  if (!isObject(fieldDefsRaw)) {
    errors.push(
      makeError(
        'E_REQUIRED_FIELD_MISSING',
        `Type ${typeObj.typeId} fields.fieldDefs must be a map keyed by field name`,
        typeObj.file
      )
    );
    return;
  }
  const requiredFields: string[] = [];
  for (const [fieldName, def] of Object.entries(fieldDefsRaw)) {
    if (!isObject(def)) {
      errors.push(
        makeError(
          'E_REQUIRED_FIELD_MISSING',
          `Type ${typeObj.typeId} fields.fieldDefs.${fieldName} must be an object`,
          typeObj.file
        )
      );
      continue;
    }
    if ('required' in def && typeof def.required !== 'boolean') {
      errors.push(
        makeError(
          'E_REQUIRED_FIELD_MISSING',
          `Type ${typeObj.typeId} fields.fieldDefs.${fieldName}.required must be boolean when present`,
          typeObj.file
        )
      );
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
      const value = (record.fields as Record<string, unknown>)[fieldName];
      const missing =
        value === undefined ||
        value === null ||
        (typeof value === 'string' && value.trim().length === 0);
      if (missing) {
        errors.push(
          makeError(
            'E_REQUIRED_FIELD_MISSING',
            `Record ${record.identity} is missing required field "${fieldName}"`,
            record.file
          )
        );
      }
    }
  }
}

function enforceCompositionShape(typeObj: ParsedTypeObject, errors: ValidationError[]): CompositionComponent[] {
  const compositionRaw = (typeObj.fields as Record<string, unknown>).composition;
  if (compositionRaw === undefined) {
    return [];
  }
  if (!isObject(compositionRaw)) {
    errors.push(
      makeError(
        'E_COMPOSITION_SCHEMA_INVALID',
        `Type ${typeObj.typeId} fields.composition must be a map keyed by component name.`,
        typeObj.file
      )
    );
    return [];
  }
  const components: CompositionComponent[] = [];
  for (const [name, value] of Object.entries(compositionRaw)) {
    if (!isObject(value) || Array.isArray(value)) {
      errors.push(
        makeError(
          'E_COMPOSITION_SCHEMA_INVALID',
          `Type ${typeObj.typeId} composition.${name} must be an object.`,
          typeObj.file
        )
      );
      continue;
    }
    const typeId = value.typeId;
    if (typeof typeId !== 'string' || !IDENTIFIER_PATTERN.test(typeId)) {
      errors.push(
        makeError(
          'E_COMPOSITION_SCHEMA_INVALID',
          `Type ${typeObj.typeId} composition.${name}.typeId must satisfy ID-001`,
          typeObj.file
        )
      );
      continue;
    }
    if (!Object.prototype.hasOwnProperty.call(value, 'required')) {
      errors.push(
        makeError(
          'E_COMPOSITION_SCHEMA_INVALID',
          `Type ${typeObj.typeId} composition.${name} must define required: boolean`,
          typeObj.file
        )
      );
      continue;
    }
    if (typeof value.required !== 'boolean') {
      errors.push(
        makeError(
          'E_COMPOSITION_SCHEMA_INVALID',
          `Type ${typeObj.typeId} composition.${name}.required must be boolean`,
          typeObj.file
        )
      );
      continue;
    }
    const allowedKeys = new Set(['typeId', 'required']);
    const extra = Object.keys(value).find((k) => !allowedKeys.has(k));
    if (extra) {
      errors.push(
        makeError(
          'E_COMPOSITION_SCHEMA_INVALID',
          `Type ${typeObj.typeId} composition.${name} contains forbidden key "${extra}"`,
          typeObj.file
        )
      );
      continue;
    }
    components.push({ typeId, required: value.required === true });
  }
  return components;
}

function validateBlockStore(
  snapshot: DatasetSnapshot,
  records: ParsedRecordObject[],
  errors: ValidationError[]
): void {
  const blockFiles = [...snapshot.files.keys()].filter((p) => p.startsWith('blocks/'));
  for (const path of blockFiles) {
    if (!path.startsWith('blocks/sha2-256/')) {
      errors.push(makeError('E_BLOCK_PATH_INVALID', `Invalid block path ${path}`, path));
      continue;
    }
    const parts = path.split('/');
    if (parts.length !== 4) {
      errors.push(makeError('E_BLOCK_PATH_INVALID', `Invalid block path ${path}`, path));
      continue;
    }
    const [, algo, prefix, cid] = parts;
    if (algo !== 'sha2-256') {
      errors.push(makeError('E_BLOCK_PATH_INVALID', `Invalid block algorithm segment in ${path}`, path));
      continue;
    }
    if (!/^[0-9a-f]{2}$/.test(prefix)) {
      errors.push(makeError('E_BLOCK_PATH_INVALID', `Invalid block prefix ${prefix} in ${path}`, path));
      continue;
    }
    let decoded: ReturnType<typeof decodeDaslCidString>;
    try {
      decoded = decodeDaslCidString(cid);
    } catch {
      errors.push(makeError('E_BLOCK_PATH_INVALID', `Invalid CID in block path ${path}`, path));
      continue;
    }
    if (blockPathForCid(cid) !== path) {
      errors.push(makeError('E_BLOCK_PATH_INVALID', `Block path ${path} is not canonical`, path));
      continue;
    }
    const bytes = snapshot.files.get(path);
    if (!bytes) {
      continue;
    }
    const digest = sha256(bytes);
    if (digest.length !== decoded.digest.length) {
      errors.push(
        makeError('E_BLOCK_DIGEST_MISMATCH', `Block file ${path} digest does not match its CID`, path)
      );
      continue;
    }
    for (let i = 0; i < digest.length; i += 1) {
      if (digest[i] !== decoded.digest[i]) {
        errors.push(
          makeError('E_BLOCK_DIGEST_MISMATCH', `Block file ${path} digest does not match its CID`, path)
        );
        break;
      }
    }
  }

  for (const record of records) {
    const strings = new Set<string>();
    collectStringValues(record.fields, strings);
    collectStringValues(record.body, strings);
    for (const value of strings) {
      const { cids, invalidCidTokens } = extractCidRefs(value);
      for (const token of invalidCidTokens) {
        errors.push(makeError('E_CID_INVALID', `Invalid CID reference ${token}`, record.file));
      }
      for (const cid of cids) {
        const path = blockPathForCid(cid);
        if (!snapshot.files.has(path)) {
          errors.push(
            makeError(
              'E_BLOCK_REFERENCE_MISSING',
              `Block ${cid} referenced from ${record.identity} is missing`,
              record.file
            )
          );
        }
      }
    }
  }

  // Referenced blocks used for GC/export; no validity failure for garbage blocks.
}

function collectRecordRefsFromRecord(record: ParsedRecordObject): Set<string> {
  const refs = new Set<string>();
  const strings = new Set<string>();
  collectStringValues(record.fields, strings);
  collectStringValues(record.body, strings);
  for (const value of strings) {
    for (const ref of extractRecordRefs(value)) {
      refs.add(ref);
    }
  }
  return refs;
}

function decodeUtf8Strict(bytes: Uint8Array): string {
  const decoder = new TextDecoder('utf-8', { fatal: true });
  return decoder.decode(bytes);
}

export function validateDatasetSnapshot(snapshot: DatasetSnapshot): ValidateDatasetResult {
  const errors: ValidationError[] = [];

  const parsed = discoverGraphdownObjects(snapshot);
  if (parsed.errors.length) {
    return { ok: false, errors: parsed.errors };
  }

  const allPaths = [...snapshot.files.keys()].sort((a, b) => a.localeCompare(b));
  const pluginManifests: ParsedPluginManifest[] = [];
  const pluginManifestPaths = new Set<string>();

  for (const path of allPaths) {
    const bytes = snapshot.files.get(path);
    if (!bytes) {
      continue;
    }
    if (!isPluginManifestCandidateBytes(path, bytes)) {
      continue;
    }
    let text: string;
    try {
      text = decodeUtf8Strict(bytes);
    } catch {
      errors.push(
        makeError('E_PLUGIN_MANIFEST_INVALID', `Plugin manifest ${path} is not valid UTF-8`, path)
      );
      continue;
    }
    const parsedManifest = parsePluginManifest(text, path);
    if (!parsedManifest.ok) {
      errors.push(
        makeError(
          'E_PLUGIN_MANIFEST_INVALID',
          parsedManifest.error.message,
          path,
          parsedManifest.error.hint
        )
      );
      continue;
    }
    pluginManifests.push(parsedManifest.manifest);
    pluginManifestPaths.add(path);
  }

  pluginManifests.sort((a, b) => a.file.localeCompare(b.file));

  const recordFilePaths = new Set([
    ...parsed.typeObjects.map((obj) => obj.file),
    ...parsed.recordObjects.map((obj) => obj.file),
  ]);

  const pushPluginError = (
    code: ValidationError['code'],
    message: string,
    file: string,
    hint?: string
  ) => {
    errors.push(makeError(code, message, file, hint));
  };

  const requiredPluginKeys = ['pluginId', 'gdApiVersion', 'entry', 'files'] as const;
  const optionalPluginKeys = ['meta', 'config', 'requires', 'blocks'] as const;
  const forbiddenPluginKeys = ['typeId', 'recordId', 'parent', 'fields'];
  const allowedPluginKeys = new Set([...requiredPluginKeys, ...optionalPluginKeys]);

  for (const manifest of pluginManifests) {
    const yaml = manifest.yaml;
    const hasKey = (key: string) => Object.prototype.hasOwnProperty.call(yaml, key);

    const missing = requiredPluginKeys.filter((key) => !hasKey(key));
    if (missing.length > 0) {
      pushPluginError(
        'E_PLUGIN_KEYS_INVALID',
        `Plugin manifest is missing required keys: ${missing.join(', ')}`,
        manifest.file
      );
    }

    const forbidden = forbiddenPluginKeys.filter((key) => hasKey(key));
    if (forbidden.length > 0) {
      pushPluginError(
        'E_PLUGIN_KEYS_INVALID',
        `Plugin manifest contains forbidden keys: ${forbidden.join(', ')}`,
        manifest.file
      );
    }

    const extraKeys = Object.keys(yaml).filter((key) => !allowedPluginKeys.has(key));
    if (extraKeys.length > 0) {
      pushPluginError(
        'E_PLUGIN_KEYS_INVALID',
        `Plugin manifest contains unknown keys: ${extraKeys.join(', ')}`,
        manifest.file
      );
    }

    const pluginId = (yaml as Record<string, unknown>).pluginId;
    if (typeof pluginId !== 'string' || !isValidPluginId(pluginId)) {
      pushPluginError(
        'E_PLUGIN_KEYS_INVALID',
        'Plugin manifest pluginId must be a valid identifier string',
        manifest.file
      );
    }

    const gdApiVersion = (yaml as Record<string, unknown>).gdApiVersion;
    if (typeof gdApiVersion !== 'number' || !Number.isInteger(gdApiVersion) || gdApiVersion < 1) {
      pushPluginError(
        'E_PLUGIN_KEYS_INVALID',
        'Plugin manifest gdApiVersion must be an integer >= 1',
        manifest.file
      );
    }

    const entry = (yaml as Record<string, unknown>).entry;
    if (typeof entry !== 'string') {
      pushPluginError(
        'E_PLUGIN_KEYS_INVALID',
        'Plugin manifest entry must be a string',
        manifest.file
      );
    }

    const files = (yaml as Record<string, unknown>).files;
    if (!Array.isArray(files) || files.some((item) => typeof item !== 'string')) {
      pushPluginError(
        'E_PLUGIN_KEYS_INVALID',
        'Plugin manifest files must be an array of strings',
        manifest.file
      );
    }

    if (hasKey('meta')) {
      const meta = (yaml as Record<string, unknown>).meta;
      if (!isObject(meta) || Array.isArray(meta)) {
        pushPluginError(
          'E_PLUGIN_KEYS_INVALID',
          'Plugin manifest meta must be an object',
          manifest.file
        );
      }
    }

    if (hasKey('config')) {
      const config = (yaml as Record<string, unknown>).config;
      if (!isObject(config) || Array.isArray(config)) {
        pushPluginError(
          'E_PLUGIN_KEYS_INVALID',
          'Plugin manifest config must be an object',
          manifest.file
        );
      }
    }

    if (hasKey('requires')) {
      const requires = (yaml as Record<string, unknown>).requires;
      if (!Array.isArray(requires) || requires.some((item) => typeof item !== 'string')) {
        pushPluginError(
          'E_PLUGIN_KEYS_INVALID',
          'Plugin manifest requires must be an array of strings',
          manifest.file
        );
      }
    }

    if (hasKey('blocks')) {
      const blocks = (yaml as Record<string, unknown>).blocks;
      if (!Array.isArray(blocks)) {
        pushPluginError(
          'E_PLUGIN_KEYS_INVALID',
          'Plugin manifest blocks must be an array when present',
          manifest.file
        );
      }
    }
  }

  const pluginIdToManifestPath = new Map<string, string>();
  for (const manifest of pluginManifests) {
    const pluginId = (manifest.yaml as Record<string, unknown>).pluginId;
    if (!isValidPluginId(pluginId)) {
      continue;
    }
    if (pluginIdToManifestPath.has(pluginId)) {
      const previousPath = pluginIdToManifestPath.get(pluginId) ?? 'unknown';
      pushPluginError(
        'E_PLUGIN_DUPLICATE_ID',
        `Duplicate pluginId ${pluginId} declared in ${previousPath} and ${manifest.file}`,
        manifest.file
      );
    } else {
      pluginIdToManifestPath.set(pluginId, manifest.file);
    }
  }

  for (const manifest of pluginManifests) {
    const entry = (manifest.yaml as Record<string, unknown>).entry;
    const files = (manifest.yaml as Record<string, unknown>).files;
    if (typeof entry === 'string' && Array.isArray(files)) {
      if (entry.trim().length === 0 || !isSafeRelativePath(entry) || !files.includes(entry)) {
        pushPluginError(
          'E_PLUGIN_ENTRY_INVALID',
          `Plugin manifest entry must be a safe relative path included in files (entry: ${entry})`,
          manifest.file
        );
      }
    }

    if (Array.isArray(files) && files.includes('manifest.md')) {
      pushPluginError(
        'E_PLUGIN_PATH_RESERVED',
        'Plugin manifest files must not include reserved path "manifest.md"',
        manifest.file
      );
    }
  }

  for (const manifest of pluginManifests) {
    const files = (manifest.yaml as Record<string, unknown>).files;
    if (!Array.isArray(files) || files.some((item) => typeof item !== 'string')) {
      continue;
    }
    const fileList = files as string[];

    const seen = new Set<string>();
    const duplicates: string[] = [];
    for (const entry of fileList) {
      if (seen.has(entry)) {
        duplicates.push(entry);
      }
      seen.add(entry);
    }
    if (duplicates.length > 0) {
      pushPluginError(
        'E_PLUGIN_FILES_DUPLICATE',
        `Plugin manifest files contains duplicates: ${[...new Set(duplicates)].join(', ')}`,
        manifest.file
      );
    }

    for (const p of fileList) {
      if (!isSafeRelativePath(p)) {
        pushPluginError(
          'E_PLUGIN_PATH_INVALID',
          `Plugin manifest file path is not safe: ${p}`,
          manifest.file
        );
      }
    }

    const resolved = resolvePluginBundlePaths(manifest.file, fileList);
    const resolvedToRelative = new Map<string, string>();
    for (const relative of fileList) {
      const resolvedPath = resolved.get(relative);
      if (!resolvedPath) {
        continue;
      }
      const existing = resolvedToRelative.get(resolvedPath);
      if (existing && existing !== relative) {
        pushPluginError(
          'E_PLUGIN_FILES_DUPLICATE',
          `Plugin manifest files ${existing} and ${relative} resolve to the same path ${resolvedPath}`,
          manifest.file
        );
      } else {
        resolvedToRelative.set(resolvedPath, relative);
      }
    }

    for (const relative of fileList) {
      const resolvedPath = resolved.get(relative);
      if (!resolvedPath) {
        continue;
      }
      if (!snapshot.files.has(resolvedPath)) {
        pushPluginError(
          'E_PLUGIN_FILE_MISSING',
          `Plugin manifest file ${relative} is missing at ${resolvedPath}`,
          manifest.file
        );
        continue;
      }
      if (
        recordFilePaths.has(resolvedPath) ||
        resolvedPath.startsWith('blocks/') ||
        pluginManifestPaths.has(resolvedPath)
      ) {
        pushPluginError(
          'E_PLUGIN_FILE_KIND_FORBIDDEN',
          `Plugin manifest file ${relative} resolves to forbidden path ${resolvedPath}`,
          manifest.file
        );
      }
    }

    for (const relative of fileList) {
      const resolvedPath = resolved.get(relative);
      if (!resolvedPath) {
        continue;
      }
      const bytes = snapshot.files.get(resolvedPath);
      if (!bytes) {
        continue;
      }
      try {
        decodeUtf8Strict(bytes);
      } catch {
        pushPluginError(
          'E_PLUGIN_UTF8_INVALID',
          `Plugin manifest file ${resolvedPath} is not valid UTF-8`,
          manifest.file
        );
      }
    }
  }

  for (const manifest of pluginManifests) {
    const blocks = (manifest.yaml as Record<string, unknown>).blocks;
    if (blocks === undefined) {
      continue;
    }
    if (!Array.isArray(blocks)) {
      pushPluginError(
        'E_PLUGIN_BLOCK_CID_INVALID',
        'Plugin manifest blocks must be an array of CID strings',
        manifest.file
      );
      continue;
    }

    const decodedBlocks: Array<{ cid: string; decoded: ReturnType<typeof decodeDaslCidString> }> = [];
    for (const entry of blocks) {
      if (typeof entry !== 'string') {
        pushPluginError(
          'E_PLUGIN_BLOCK_CID_INVALID',
          'Plugin manifest blocks must contain only CID strings',
          manifest.file
        );
        continue;
      }
      try {
        const decoded = decodeDaslCidString(entry);
        decodedBlocks.push({ cid: entry, decoded });
      } catch {
        pushPluginError(
          'E_PLUGIN_BLOCK_CID_INVALID',
          `Plugin manifest block CID is invalid: ${entry}`,
          manifest.file
        );
      }
    }

    for (const { cid, decoded } of decodedBlocks) {
      const blockPath = blockPathForCid(cid);
      const bytes = snapshot.files.get(blockPath);
      if (!bytes) {
        pushPluginError(
          'E_PLUGIN_BLOCK_MISSING_OR_INVALID',
          `Plugin manifest block ${cid} is missing at ${blockPath}`,
          manifest.file
        );
        continue;
      }
      const digest = sha256(bytes);
      if (digest.length !== decoded.digest.length) {
        pushPluginError(
          'E_PLUGIN_BLOCK_MISSING_OR_INVALID',
          `Plugin manifest block ${cid} digest does not match its CID`,
          manifest.file
        );
        continue;
      }
      for (let i = 0; i < digest.length; i += 1) {
        if (digest[i] !== decoded.digest[i]) {
          pushPluginError(
            'E_PLUGIN_BLOCK_MISSING_OR_INVALID',
            `Plugin manifest block ${cid} digest does not match its CID`,
            manifest.file
          );
          break;
        }
      }
    }
  }

  const typesById = new Map<string, ParsedTypeObject>();
  for (const typeObj of parsed.typeObjects) {
    if (typesById.has(typeObj.typeId)) {
      errors.push(makeError('E_DUPLICATE_ID', `Duplicate typeId ${typeObj.typeId}`, typeObj.file));
    } else {
      typesById.set(typeObj.typeId, typeObj);
    }
  }

  const recordsByKey = new Map<string, ParsedRecordObject>();
  const recordsByTypeId = new Map<string, ParsedRecordObject[]>();
  for (const record of parsed.recordObjects) {
    if (recordsByKey.has(record.identity)) {
      errors.push(makeError('E_DUPLICATE_ID', `Duplicate record identity ${record.identity}`, record.file));
    } else {
      recordsByKey.set(record.identity, record);
    }
    const list = recordsByTypeId.get(record.typeId) ?? [];
    list.push(record);
    recordsByTypeId.set(record.typeId, list);
  }

  for (const record of parsed.recordObjects) {
    if (typeof record.parent === 'string' && !recordsByKey.has(record.parent)) {
      errors.push(
        makeError(
          'E_PARENT_MISSING',
          `Record ${record.identity} parent ${record.parent} does not exist`,
          record.file
        )
      );
    }
  }

  const parentState = new Map<string, 0 | 1 | 2>();
  const visitParent = (recordKey: string, stack: string[]) => {
    const state = parentState.get(recordKey) ?? 0;
    if (state === 1) {
      const cycleStartIndex = stack.indexOf(recordKey);
      const cyclePath =
        cycleStartIndex >= 0 ? stack.slice(cycleStartIndex).concat(recordKey) : stack.concat(recordKey);
      const file = recordsByKey.get(recordKey)?.file;
      if (file) {
        errors.push(
          makeError('E_PARENT_CYCLE', `Parent pointer cycle detected: ${cyclePath.join(' -> ')}`, file)
        );
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
        errors.push(
          makeError('E_PARENT_CYCLE', `Parent pointer cycle detected: ${recordKey} -> ${recordKey}`, record.file)
        );
      } else if (recordsByKey.has(parentKey)) {
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

  for (const record of parsed.recordObjects) {
    if (!typesById.has(record.typeId)) {
      errors.push(
        makeError(
          'E_TYPEID_MISMATCH',
          `Record ${record.identity} references missing typeId ${record.typeId}`,
          record.file
        )
      );
    }
  }

  for (const typeObj of parsed.typeObjects) {
    const records = recordsByTypeId.get(typeObj.typeId) ?? [];
    enforceFieldDefs(typeObj, records, errors);
    const components = enforceCompositionShape(typeObj, errors);
    for (const component of components) {
      if (!typesById.has(component.typeId)) {
        errors.push(
          makeError(
            'E_COMPOSITION_UNKNOWN_TYPE',
            `Type ${typeObj.typeId} composition references missing typeId ${component.typeId}`,
            typeObj.file
          )
        );
        continue;
      }
      if (!component.required) {
        continue;
      }
      for (const record of records) {
        const refs = collectRecordRefsFromRecord(record);
        const matches = [...refs].filter((ref) => recordsByKey.has(ref) && recordsByKey.get(ref)!.typeId === component.typeId);
        if (matches.length === 0) {
          errors.push(
            makeError(
              'E_COMPOSITION_CONSTRAINT_VIOLATION',
              `Record ${record.identity} must link to at least one ${component.typeId} to satisfy composition "${component.typeId}"`,
              record.file
            )
          );
        }
      }
    }
  }

  validateBlockStore(snapshot, parsed.recordObjects, errors);

  if (errors.length) {
    return { ok: false, errors };
  }

  return { ok: true };
}
