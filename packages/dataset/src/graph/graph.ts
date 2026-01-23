import { discoverGraphMDObjects } from '../parse/datasetObjects.js';
import { makeError, type ValidationError } from '../validate/errors.js';
import type { DatasetSnapshot } from '../model/snapshotTypes.js';
import { extractRecordRefs } from '../parse/wikiRefs.js';
import { collectStringValues } from '../internal/collectStringValues.js';

export type RecordLinkGraphNodeKind = 'type' | 'record';

export interface RecordLinkGraphTypeNode {
  kind: 'type';
  typeId: string;
  fields: Record<string, unknown>;
  body: string;
  file: string;
}

export interface RecordLinkGraphRecordNode {
  kind: 'record';
  typeId: string;
  recordId: string;
  recordKey: string;
  fields: Record<string, unknown>;
  body: string;
  file: string;
}

export interface RecordLinkGraph {
  typesById: Map<string, RecordLinkGraphTypeNode>;
  recordsByKey: Map<string, RecordLinkGraphRecordNode>;
  nodesByIdentity: Map<string, RecordLinkGraphTypeNode | RecordLinkGraphRecordNode>;
  outgoingRecordLinks: Map<string, Set<string>>;
  incomingRecordLinks: Map<string, Set<string>>;
  getOutgoingRecordLinks(recordKey: string): string[];
  getIncomingRecordLinks(recordKey: string): string[];
  getType(typeId: string): RecordLinkGraphTypeNode | null;
  getRecord(recordKey: string): RecordLinkGraphRecordNode | null;
  getTypeForRecord(recordKey: string): RecordLinkGraphTypeNode | null;
  getTypeIdForIdentity(identity: string): string | null;
}

export type BuildRecordLinkGraphResult =
  | { ok: true; graph: RecordLinkGraph }
  | { ok: false; errors: ValidationError[] };

function collectRecordRefsFromRecord(fields: Record<string, unknown>, body: string): Set<string> {
  const strings = new Set<string>();
  collectStringValues(fields, strings);
  collectStringValues(body, strings);
  const refs = new Set<string>();
  for (const value of strings) {
    for (const ref of extractRecordRefs(value)) {
      refs.add(ref);
    }
  }
  return refs;
}

class RecordLinkGraphImpl implements RecordLinkGraph {
  constructor(
    public typesById: Map<string, RecordLinkGraphTypeNode>,
    public recordsByKey: Map<string, RecordLinkGraphRecordNode>,
    public nodesByIdentity: Map<string, RecordLinkGraphTypeNode | RecordLinkGraphRecordNode>,
    public outgoingRecordLinks: Map<string, Set<string>>,
    public incomingRecordLinks: Map<string, Set<string>>
  ) {}

  getOutgoingRecordLinks(recordKey: string): string[] {
    const links = this.outgoingRecordLinks.get(recordKey);
    return links ? [...links].sort((a, b) => a.localeCompare(b)) : [];
  }

  getIncomingRecordLinks(recordKey: string): string[] {
    const links = this.incomingRecordLinks.get(recordKey);
    return links ? [...links].sort((a, b) => a.localeCompare(b)) : [];
  }

  getType(typeId: string): RecordLinkGraphTypeNode | null {
    return this.typesById.get(typeId) ?? null;
  }

  getRecord(recordKey: string): RecordLinkGraphRecordNode | null {
    return this.recordsByKey.get(recordKey) ?? null;
  }

  getTypeForRecord(recordKey: string): RecordLinkGraphTypeNode | null {
    const record = this.recordsByKey.get(recordKey);
    if (!record) return null;
    return this.typesById.get(record.typeId) ?? null;
  }

  getTypeIdForIdentity(identity: string): string | null {
    const record = this.recordsByKey.get(identity);
    if (record) return record.typeId;
    const type = this.typesById.get(identity);
    if (type) return type.typeId;
    return null;
  }
}

export function buildRecordLinkGraphFromSnapshot(snapshot: DatasetSnapshot): BuildRecordLinkGraphResult {
  const parsed = discoverGraphMDObjects(snapshot);
  if (parsed.errors.length) {
    return { ok: false, errors: parsed.errors };
  }

  const errors: ValidationError[] = [];
  const typesById = new Map<string, RecordLinkGraphTypeNode>();
  const recordsByKey = new Map<string, RecordLinkGraphRecordNode>();
  const nodesByIdentity = new Map<string, RecordLinkGraphTypeNode | RecordLinkGraphRecordNode>();
  const outgoingRecordLinks = new Map<string, Set<string>>();
  const incomingRecordLinks = new Map<string, Set<string>>();

  for (const typeObj of parsed.typeObjects) {
    if (typesById.has(typeObj.typeId)) {
      errors.push(makeError('E_DUPLICATE_ID', `Duplicate typeId ${typeObj.typeId}`, typeObj.file));
      continue;
    }
    const typeNode: RecordLinkGraphTypeNode = {
      kind: 'type',
      typeId: typeObj.typeId,
      fields: typeObj.fields,
      body: typeObj.body,
      file: typeObj.file,
    };
    typesById.set(typeObj.typeId, typeNode);
    nodesByIdentity.set(typeObj.typeId, typeNode);
  }

  for (const recordObj of parsed.recordObjects) {
    if (recordsByKey.has(recordObj.identity)) {
      errors.push(makeError('E_DUPLICATE_ID', `Duplicate record identity ${recordObj.identity}`, recordObj.file));
      continue;
    }
    if (!typesById.has(recordObj.typeId)) {
      errors.push(
        makeError('E_TYPEID_MISMATCH', `Record ${recordObj.identity} references missing typeId ${recordObj.typeId}`, recordObj.file)
      );
    }
    const recordNode: RecordLinkGraphRecordNode = {
      kind: 'record',
      typeId: recordObj.typeId,
      recordId: recordObj.recordId,
      recordKey: recordObj.identity,
      fields: recordObj.fields,
      body: recordObj.body,
      file: recordObj.file,
    };
    recordsByKey.set(recordObj.identity, recordNode);
    nodesByIdentity.set(recordObj.identity, recordNode);
  }

  for (const record of recordsByKey.values()) {
    const refs = collectRecordRefsFromRecord(record.fields, record.body);
    if (!refs.size) continue;
    outgoingRecordLinks.set(record.recordKey, refs);
    for (const ref of refs) {
      if (!incomingRecordLinks.has(ref)) {
        incomingRecordLinks.set(ref, new Set());
      }
      incomingRecordLinks.get(ref)?.add(record.recordKey);
    }
  }

  if (errors.length) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    graph: new RecordLinkGraphImpl(
      typesById,
      recordsByKey,
      nodesByIdentity,
      outgoingRecordLinks,
      incomingRecordLinks
    ),
  };
}
