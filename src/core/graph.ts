import { extractFrontMatter } from './frontMatter';
import { makeError, ValidationError } from './errors';
import { normalizeRefs } from './refs';
import { loadRepoSnapshotFromFs, RepoSnapshot } from './snapshot';
import { parseYamlObject } from './yaml';
import { extractWikiLinks } from './wikiLinks';

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
  getLinksFrom: (id: string) => string[];
  getLinksTo: (id: string) => string[];
  getRecordTypeId: (id: string) => string | null;
  getTypeForRecord: (id: string) => GraphTypeDef | null;
}

const recordTypeIdPattern = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

function sortStable(values: Iterable<string>): string[] {
  return Array.from(values).sort((a, b) => a.localeCompare(b));
}

export function parseMarkdownRecord(
  text: string,
  file: string
):
  | { ok: true; yaml: Record<string, unknown>; body: string }
  | { ok: false; error: ValidationError } {
  let yaml: string;
  let body: string;
  try {
    ({ yaml, body } = extractFrontMatter(text));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const code = message.includes('Missing closing YAML front matter delimiter')
      ? 'E_FRONT_MATTER_UNTERMINATED'
      : 'E_FRONT_MATTER_MISSING';
    return { ok: false, error: makeError(code, message, file) };
  }
  try {
    return { ok: true, yaml: parseYamlObject(yaml), body };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const code =
      message === 'YAML front matter is not a valid object'
        ? 'E_YAML_NOT_OBJECT'
        : 'E_YAML_INVALID';
    return { ok: false, error: makeError(code, message, file) };
  }
}

export function extractYamlRefs(fields: unknown): string[] {
  const results = new Set<string>();
  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (value && typeof value === 'object') {
      for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
        if (key === 'ref' || key === 'refs') {
          for (const ref of normalizeRefs(nested)) {
            results.add(ref);
          }
        }
        visit(nested);
      }
    }
  };
  visit(fields);
  return Array.from(results);
}

function getRecordTypeIdFromNode(node: GraphNode): string | null {
  if (node.kind === 'type') {
    const recordTypeId = node.fields.recordTypeId;
    return typeof recordTypeId === 'string' ? recordTypeId : null;
  }
  if (node.kind === 'dataset') {
    return 'sys:dataset';
  }
  return node.typeId || null;
}

function makeGraph(
  nodesById: Map<string, GraphNode>,
  typesByRecordTypeId: Map<string, GraphTypeDef>,
  outgoing: Map<string, Set<string>>,
  incoming: Map<string, Set<string>>
): Graph {
  return {
    nodesById,
    typesByRecordTypeId,
    outgoing,
    incoming,
    getLinksFrom(id: string): string[] {
      return sortStable(outgoing.get(id) ?? []);
    },
    getLinksTo(id: string): string[] {
      return sortStable(incoming.get(id) ?? []);
    },
    getRecordTypeId(id: string): string | null {
      const node = nodesById.get(id);
      if (!node) {
        return null;
      }
      return getRecordTypeIdFromNode(node);
    },
    getTypeForRecord(id: string): GraphTypeDef | null {
      const node = nodesById.get(id);
      if (!node) {
        return null;
      }
      if (node.kind === 'type' || node.kind === 'dataset') {
        return null;
      }
      return typesByRecordTypeId.get(node.typeId) ?? null;
    }
  };
}

function shouldIncludeFile(file: string): boolean {
  if (!file.toLowerCase().endsWith('.md')) {
    return false;
  }
  return (
    file.startsWith('datasets/') || file.startsWith('types/') || file.startsWith('records/')
  );
}

function detectNodeKind(file: string): GraphNodeKind {
  if (file.startsWith('datasets/')) {
    return 'dataset';
  }
  if (file.startsWith('types/')) {
    return 'type';
  }
  return 'record';
}

function ensureEdge(map: Map<string, Set<string>>, id: string): Set<string> {
  let set = map.get(id);
  if (!set) {
    set = new Set();
    map.set(id, set);
  }
  return set;
}

function addEdges(sourceId: string, targets: string[], outgoing: Map<string, Set<string>>, incoming: Map<string, Set<string>>): void {
  if (targets.length === 0) {
    return;
  }
  const outSet = ensureEdge(outgoing, sourceId);
  for (const target of targets) {
    if (!target || target === sourceId) {
      continue;
    }
    outSet.add(target);
    ensureEdge(incoming, target).add(sourceId);
  }
}

function isValidRecordTypeId(value: string): boolean {
  return recordTypeIdPattern.test(value);
}

export function buildGraphFromSnapshot(
  snapshot: RepoSnapshot
): { ok: true; graph: Graph } | { ok: false; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  const nodesById = new Map<string, GraphNode>();
  const typesByRecordTypeId = new Map<string, GraphTypeDef>();
  const outgoing = new Map<string, Set<string>>();
  const incoming = new Map<string, Set<string>>();

  for (const [file, contents] of snapshot.files.entries()) {
    if (!shouldIncludeFile(file)) {
      continue;
    }
    const text = Buffer.from(contents).toString('utf8');
    const parsed = parseMarkdownRecord(text, file);
    if (!parsed.ok) {
      errors.push(parsed.error);
      continue;
    }
    const yaml = parsed.yaml;
    const node: GraphNode = {
      id: String(yaml.id ?? ''),
      datasetId: String(yaml.datasetId ?? ''),
      typeId: String(yaml.typeId ?? ''),
      createdAt: String(yaml.createdAt ?? ''),
      updatedAt: String(yaml.updatedAt ?? ''),
      fields: (yaml.fields ?? {}) as Record<string, unknown>,
      body: parsed.body,
      file,
      kind: detectNodeKind(file)
    };

    if (nodesById.has(node.id)) {
      errors.push(
        makeError('E_DUPLICATE_ID', `Duplicate id detected: ${node.id} (in ${file})`, file)
      );
      continue;
    }
    nodesById.set(node.id, node);

    if (node.kind === 'type') {
      const recordTypeId = node.fields.recordTypeId;
      if (typeof recordTypeId !== 'string') {
        errors.push(
          makeError(
            'E_REQUIRED_FIELD_MISSING',
            'Type record is missing required field recordTypeId',
            file
          )
        );
        continue;
      }
      if (!isValidRecordTypeId(recordTypeId)) {
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
            `Duplicate recordTypeId detected: ${recordTypeId} (in ${file})`,
            file
          )
        );
        continue;
      }
      typesByRecordTypeId.set(recordTypeId, {
        recordTypeId,
        typeRecordId: node.id,
        file,
        fields: node.fields,
        displayName: typeof node.fields.name === 'string' ? node.fields.name : undefined
      });
    }
  }

  for (const node of nodesById.values()) {
    const explicitRefs = extractYamlRefs(node.fields);
    const wikiRefs = extractWikiLinks(node.body);
    const targets = Array.from(new Set([...explicitRefs, ...wikiRefs]));
    addEdges(node.id, targets, outgoing, incoming);
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, graph: makeGraph(nodesById, typesByRecordTypeId, outgoing, incoming) };
}

export function buildGraphFromFs(
  rootDir: string
): { ok: true; graph: Graph } | { ok: false; errors: ValidationError[] } {
  const snapshot = loadRepoSnapshotFromFs(rootDir);
  return buildGraphFromSnapshot(snapshot);
}
