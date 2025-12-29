import { makeError, ValidationError } from './errors';
import { extractFrontMatter } from './frontMatter';
import { normalizeRefs } from './refs';
import { getTextFile, loadRepoSnapshotFromFs, RepoSnapshot } from './snapshot';
import { getString, isObject } from './types';
import { extractWikiLinks } from './wikiLinks';
import { parseYamlObject } from './yaml';

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

export class Graph {
  nodesById = new Map<string, GraphNode>();
  typesByRecordTypeId = new Map<string, GraphTypeDef>();
  outgoing = new Map<string, Set<string>>();
  incoming = new Map<string, Set<string>>();

  getLinksFrom(id: string): string[] {
    return sortIds(this.outgoing.get(id));
  }

  getLinksTo(id: string): string[] {
    return sortIds(this.incoming.get(id));
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
      const recordTypeId = node.fields.recordTypeId;
      return typeof recordTypeId === 'string' ? recordTypeId : null;
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

export function buildGraphFromFs(
  rootDir: string
): { ok: true; graph: Graph } | { ok: false; errors: ValidationError[] } {
  const snapshot = loadRepoSnapshotFromFs(rootDir);
  return buildGraphFromSnapshot(snapshot);
}

export function buildGraphFromSnapshot(
  snapshot: RepoSnapshot
): { ok: true; graph: Graph } | { ok: false; errors: ValidationError[] } {
  const graph = new Graph();
  const errors: ValidationError[] = [];

  for (const [file] of snapshot.files) {
    if (!isEligibleMarkdown(file)) {
      continue;
    }
    const kind = getNodeKind(file);
    if (!kind) {
      continue;
    }
    const text = getTextFile(snapshot, file);
    const parsed = parseMarkdownRecord(text, file);
    if (!parsed.ok) {
      errors.push(parsed.error);
      continue;
    }
    const yaml = parsed.yaml;
    const fields = isObject(yaml.fields) ? yaml.fields : {};
    const id = getString(yaml, 'id');
    const datasetId = getString(yaml, 'datasetId') ?? '';
    const typeId = getString(yaml, 'typeId') ?? '';
    const createdAt = getString(yaml, 'createdAt') ?? '';
    const updatedAt = getString(yaml, 'updatedAt') ?? '';
    const node: GraphNode = {
      id: id ?? '',
      datasetId,
      typeId,
      createdAt,
      updatedAt,
      fields,
      body: parsed.body,
      file,
      kind
    };

    if (id) {
      if (graph.nodesById.has(id)) {
        errors.push(
          makeError('E_DUPLICATE_ID', `Duplicate id detected: ${id} (in ${file})`, file)
        );
        continue;
      }
      graph.nodesById.set(id, node);
    }

    if (kind === 'type') {
      const recordTypeId = fields.recordTypeId;
      if (typeof recordTypeId !== 'string' || !recordTypeId) {
        errors.push(
          makeError('E_REQUIRED_FIELD_MISSING', 'Type recordTypeId is required', file)
        );
        continue;
      }
      if (!isStableRecordTypeId(recordTypeId)) {
        errors.push(
          makeError(
            'E_RECORD_TYPE_ID_INVALID',
            'Type recordTypeId must be a stable identifier (no spaces or "/")',
            file
          )
        );
        continue;
      }
      if (graph.typesByRecordTypeId.has(recordTypeId)) {
        errors.push(
          makeError(
            'E_DUPLICATE_RECORD_TYPE_ID',
            `Duplicate recordTypeId detected: ${recordTypeId}`,
            file
          )
        );
        continue;
      }
      if (id) {
        graph.typesByRecordTypeId.set(recordTypeId, {
          recordTypeId,
          typeRecordId: id,
          file,
          fields,
          displayName: getString(fields, 'name')
        });
      }
    }
  }

  for (const node of graph.nodesById.values()) {
    const refs = new Set<string>();
    for (const ref of extractYamlRefs(node.fields)) {
      if (ref && ref !== node.id) {
        refs.add(ref);
      }
    }
    for (const ref of extractWikiLinks(node.body)) {
      if (ref && ref !== node.id) {
        refs.add(ref);
      }
    }
    if (refs.size > 0) {
      graph.outgoing.set(node.id, refs);
      for (const ref of refs) {
        const incoming = graph.incoming.get(ref);
        if (incoming) {
          incoming.add(node.id);
        } else {
          graph.incoming.set(ref, new Set([node.id]));
        }
      }
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, graph };
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
    const code =
      message === 'YAML front matter is not a valid object'
        ? 'E_YAML_NOT_OBJECT'
        : 'E_YAML_INVALID';
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
    for (const [key, nested] of Object.entries(value)) {
      if (key === 'ref' || key === 'refs') {
        for (const ref of normalizeRefs(nested)) {
          refs.add(ref);
        }
      }
      visit(nested);
    }
  };

  visit(fields);
  return Array.from(refs);
}

function sortIds(ids?: Set<string>): string[] {
  if (!ids) {
    return [];
  }
  return Array.from(ids).sort((a, b) => a.localeCompare(b));
}

function isEligibleMarkdown(file: string): boolean {
  return file.toLowerCase().endsWith('.md');
}

function getNodeKind(file: string): GraphNodeKind | null {
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

function isStableRecordTypeId(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(value);
}
