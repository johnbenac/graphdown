import { discoverGraphdownObjects } from './datasetObjects';
import { makeError, type ValidationError } from './errors';
import type { RepoSnapshot } from './snapshotTypes';
import { isObject } from './types';
import { extractRecordRefs } from './wikiLinks';

export type GraphNodeKind = 'type' | 'record';

export interface GraphTypeNode {
  kind: 'type';
  typeId: string;
  fields: Record<string, unknown>;
  body: string;
  file: string;
}

export interface GraphRecordNode {
  kind: 'record';
  typeId: string;
  recordId: string;
  recordKey: string;
  fields: Record<string, unknown>;
  body: string;
  file: string;
}

export interface Graph {
  typesById: Map<string, GraphTypeNode>;
  recordsByKey: Map<string, GraphRecordNode>;
  nodesById: Map<string, GraphTypeNode | GraphRecordNode>;
  typesByRecordTypeId: Map<string, GraphTypeNode>;
  outgoing: Map<string, Set<string>>;
  incoming: Map<string, Set<string>>;
  getLinksFrom(recordKey: string): string[];
  getLinksTo(recordKey: string): string[];
  getType(typeId: string): GraphTypeNode | null;
  getRecord(recordKey: string): GraphRecordNode | null;
  getTypeForRecord(recordKey: string): GraphTypeNode | null;
  getRecordTypeId(recordKey: string): string | null;
}

export type BuildGraphResult =
  | { ok: true; graph: Graph }
  | { ok: false; errors: ValidationError[] };

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

function collectRecordRefsFromRecord(fields: Record<string, unknown>, body: string): Set<string> {
  const strings = new Set<string>();
  collectStringValues(fields, strings);
  collectStringValues(body, strings);
  const refs = new Set<string>();
  for (const ref of extractRecordRefs([...strings].join('\n'))) {
    refs.add(ref);
  }
  return refs;
}

class GraphImpl implements Graph {
  constructor(
    public typesById: Map<string, GraphTypeNode>,
    public recordsByKey: Map<string, GraphRecordNode>,
    public nodesById: Map<string, GraphTypeNode | GraphRecordNode>,
    public typesByRecordTypeId: Map<string, GraphTypeNode>,
    public outgoing: Map<string, Set<string>>,
    public incoming: Map<string, Set<string>>
  ) {}

  getLinksFrom(recordKey: string): string[] {
    const links = this.outgoing.get(recordKey);
    return links ? [...links].sort((a, b) => a.localeCompare(b)) : [];
  }

  getLinksTo(recordKey: string): string[] {
    const links = this.incoming.get(recordKey);
    return links ? [...links].sort((a, b) => a.localeCompare(b)) : [];
  }

  getType(typeId: string): GraphTypeNode | null {
    return this.typesById.get(typeId) ?? null;
  }

  getRecord(recordKey: string): GraphRecordNode | null {
    return this.recordsByKey.get(recordKey) ?? null;
  }

  getTypeForRecord(recordKey: string): GraphTypeNode | null {
    const record = this.recordsByKey.get(recordKey);
    if (!record) return null;
    return this.typesById.get(record.typeId) ?? null;
  }

  getRecordTypeId(recordKey: string): string | null {
    const record = this.recordsByKey.get(recordKey);
    if (record) return record.typeId;
    const type = this.typesById.get(recordKey);
    if (type) return type.typeId;
    return null;
  }
}

export function buildGraphFromSnapshot(snapshot: RepoSnapshot): BuildGraphResult {
  const parsed = discoverGraphdownObjects(snapshot);
  if (parsed.errors.length) {
    return { ok: false, errors: parsed.errors };
  }

  const errors: ValidationError[] = [];
  const typesById = new Map<string, GraphTypeNode>();
  const typesByRecordTypeId = typesById; // alias for compatibility
  const recordsByKey = new Map<string, GraphRecordNode>();
  const nodesById = new Map<string, GraphTypeNode | GraphRecordNode>();
  const outgoing = new Map<string, Set<string>>();
  const incoming = new Map<string, Set<string>>();

  for (const typeObj of parsed.typeObjects) {
    if (typesById.has(typeObj.typeId)) {
      errors.push(makeError('E_DUPLICATE_ID', `Duplicate typeId ${typeObj.typeId}`, typeObj.file));
      continue;
    }
    const typeNode: GraphTypeNode = {
      kind: 'type',
      typeId: typeObj.typeId,
      fields: typeObj.fields,
      body: typeObj.body,
      file: typeObj.file,
    };
    typesById.set(typeObj.typeId, typeNode);
    nodesById.set(typeObj.typeId, typeNode);
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
    const recordNode: GraphRecordNode = {
      kind: 'record',
      typeId: recordObj.typeId,
      recordId: recordObj.recordId,
      recordKey: recordObj.identity,
      fields: recordObj.fields,
      body: recordObj.body,
      file: recordObj.file,
    };
    recordsByKey.set(recordObj.identity, recordNode);
    nodesById.set(recordObj.identity, recordNode);
  }

  for (const record of recordsByKey.values()) {
    const refs = collectRecordRefsFromRecord(record.fields, record.body);
    if (!refs.size) continue;
    outgoing.set(record.recordKey, refs);
    for (const ref of refs) {
      if (!incoming.has(ref)) {
        incoming.set(ref, new Set());
      }
      incoming.get(ref)?.add(record.recordKey);
    }
  }

  if (errors.length) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    graph: new GraphImpl(typesById, recordsByKey, nodesById, typesByRecordTypeId, outgoing, incoming),
  };
}
