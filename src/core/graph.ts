import { extractFrontMatter } from './frontMatter';
import { makeError, ValidationError } from './errors';
import { normalizeRefs } from './refs';
import type { RepoSnapshot } from './snapshotTypes';
import { extractWikiLinks } from './wikiLinks';
import { parseYamlObject } from './yaml';
import { getString, isObject } from './types';

export type GraphNodeKind = 'dataset' | 'type' | 'record';

export interface GraphNode {
  id: string;
  datasetId: string;
  typeId: string;
  createdAt: string;
  updatedAt: string;
  fields: Record<string, unknown>;
  body: string;
  file: string;
  kind: GraphNodeKind;
}

export interface GraphTypeDef {
  recordTypeId: string;
  typeRecordId: string;
  file: string;
  fields?: Record<string, unknown>;
  displayName?: string;
}

export interface Graph {
  nodesById: Map<string, GraphNode>;
  typesByRecordTypeId: Map<string, GraphTypeDef>;
  outgoing: Map<string, Set<string>>;
  incoming: Map<string, Set<string>>;
  getLinksFrom(id: string): string[];
  getLinksTo(id: string): string[];
  getRecordTypeId(id: string): string | null;
  getTypeForRecord(id: string): GraphTypeDef | null;
}

export type BuildGraphResult =
  | { ok: true; graph: Graph }
  | { ok: false; errors: ValidationError[] };

const RECORD_TYPE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

const decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8') : null;

function decodeBytes(bytes: Uint8Array): string {
  if (decoder) {
    return decoder.decode(bytes);
  }
  return Buffer.from(bytes).toString('utf8');
}

class GraphImpl implements Graph {
  constructor(
    public nodesById: Map<string, GraphNode>,
    public typesByRecordTypeId: Map<string, GraphTypeDef>,
    public outgoing: Map<string, Set<string>>,
    public incoming: Map<string, Set<string>>
  ) {}

  getLinksFrom(id: string): string[] {
    const links = this.outgoing.get(id);
    return links ? [...links].sort((a, b) => a.localeCompare(b)) : [];
  }

  getLinksTo(id: string): string[] {
    const links = this.incoming.get(id);
    return links ? [...links].sort((a, b) => a.localeCompare(b)) : [];
  }

  getRecordTypeId(id: string): string | null {
    const node = this.nodesById.get(id);
    if (!node) {
      return null;
    }
    if (node.kind === 'dataset') {
      return 'sys:dataset';
    }
    if (node.kind === 'type') {
      const recordTypeId = getString(node.fields, 'recordTypeId');
      return recordTypeId ?? null;
    }
    return node.typeId || null;
  }

  getTypeForRecord(id: string): GraphTypeDef | null {
    const node = this.nodesById.get(id);
    if (!node || node.kind !== 'record') {
      return null;
    }
    return this.typesByRecordTypeId.get(node.typeId) ?? null;
  }
}

export function parseMarkdownRecord(
  text: string,
  file: string
): { ok: true; yaml: Record<string, unknown>; body: string } | { ok: false; error: ValidationError } {
  let yamlSection: string;
  let body: string;
  try {
    ({ yaml: yamlSection, body } = extractFrontMatter(text));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const code = message.includes('Missing closing YAML front matter delimiter')
      ? 'E_FRONT_MATTER_UNTERMINATED'
      : 'E_FRONT_MATTER_MISSING';
    return { ok: false, error: makeError(code, message, file) };
  }

  try {
    const yaml = parseYamlObject(yamlSection);
    return { ok: true, yaml, body };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const code = message === 'YAML front matter is not a valid object' ? 'E_YAML_NOT_OBJECT' : 'E_YAML_INVALID';
    return { ok: false, error: makeError(code, message, file) };
  }
}

export function extractYamlRefs(fields: unknown): string[] {
  const refs = new Set<string>();

  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      for (const item of value) {
        visit(item);
      }
      return;
    }
    if (!isObject(value)) {
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      if (key === 'ref' || key === 'refs') {
        for (const ref of normalizeRefs(child)) {
          refs.add(ref);
        }
      } else {
        visit(child);
      }
    }
  };

  visit(fields);
  return [...refs];
}

export function extractWikiLinksFromFields(fields: unknown): string[] {
  const results = new Set<string>();

  const visit = (value: unknown) => {
    if (typeof value === 'string') {
      for (const id of extractWikiLinks(value)) {
        results.add(id);
      }
      return;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        visit(item);
      }
      return;
    }

    if (isObject(value)) {
      for (const child of Object.values(value)) {
        visit(child);
      }
    }
  };

  visit(fields);
  return [...results];
}

function getKindForFile(file: string): GraphNodeKind | null {
  if (file.startsWith('datasets/')) {
    return 'dataset';
  }
  if (file.startsWith('types/')) {
    return 'type';
  }
  if (file.startsWith('records/')) {
    return 'record';
  }
  return null;
}

export function buildGraphFromSnapshot(snapshot: RepoSnapshot): BuildGraphResult {
  const errors: ValidationError[] = [];
  const nodesById = new Map<string, GraphNode>();
  const typesByRecordTypeId = new Map<string, GraphTypeDef>();
  const outgoing = new Map<string, Set<string>>();
  const incoming = new Map<string, Set<string>>();

  const files = [...snapshot.files.keys()].sort((a, b) => a.localeCompare(b));
  for (const file of files) {
    if (!file.toLowerCase().endsWith('.md')) {
      continue;
    }
    const kind = getKindForFile(file);
    if (!kind) {
      continue;
    }
    const raw = snapshot.files.get(file);
    if (!raw) {
      continue;
    }
    const text = decodeBytes(raw);
    const parsed = parseMarkdownRecord(text, file);
    if (!parsed.ok) {
      errors.push(parsed.error);
      continue;
    }

    const yaml = parsed.yaml;
    const fields = isObject(yaml.fields) ? yaml.fields : {};
    const node: GraphNode = {
      id: getString(yaml, 'id') ?? '',
      datasetId: getString(yaml, 'datasetId') ?? '',
      typeId: getString(yaml, 'typeId') ?? '',
      createdAt: getString(yaml, 'createdAt') ?? '',
      updatedAt: getString(yaml, 'updatedAt') ?? '',
      fields,
      body: parsed.body,
      file,
      kind
    };

    if (node.id) {
      if (nodesById.has(node.id)) {
        errors.push(
          makeError('E_DUPLICATE_ID', `Duplicate id detected: ${node.id} (in ${file})`, file)
        );
      } else {
        nodesById.set(node.id, node);
      }
    }

    if (kind === 'type') {
      const recordTypeId = getString(fields, 'recordTypeId');
      if (!recordTypeId) {
        errors.push(makeError('E_REQUIRED_FIELD_MISSING', 'Type recordTypeId is required', file));
        continue;
      }
      if (!RECORD_TYPE_ID_PATTERN.test(recordTypeId)) {
        errors.push(
          makeError(
            'E_RECORD_TYPE_ID_INVALID',
            'Type recordTypeId must be a stable identifier (no spaces or "/")',
            file
          )
        );
        continue;
      }
      if (typesByRecordTypeId.has(recordTypeId)) {
        errors.push(
          makeError(
            'E_DUPLICATE_RECORD_TYPE_ID',
            `Duplicate recordTypeId detected: ${recordTypeId}`,
            file
          )
        );
        continue;
      }
      if (node.id) {
        typesByRecordTypeId.set(recordTypeId, {
          recordTypeId,
          typeRecordId: node.id,
          file,
          fields
        });
      }
    }
  }

  for (const node of nodesById.values()) {
    const refTargets = extractYamlRefs(node.fields);
    const bodyWikiTargets = extractWikiLinks(node.body);
    const fieldWikiTargets = extractWikiLinksFromFields(node.fields);
    const targets = new Set<string>();
    for (const target of [...refTargets, ...bodyWikiTargets, ...fieldWikiTargets]) {
      if (!target || target === node.id) {
        continue;
      }
      targets.add(target);
    }
    if (targets.size) {
      outgoing.set(node.id, targets);
      for (const target of targets) {
        if (!incoming.has(target)) {
          incoming.set(target, new Set<string>());
        }
        incoming.get(target)?.add(node.id);
      }
    }
  }

  if (errors.length) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    graph: new GraphImpl(nodesById, typesByRecordTypeId, outgoing, incoming)
  };
}
