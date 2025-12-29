import { extractFrontMatter } from './frontMatter';
import { makeError, ValidationError } from './errors';
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
  nodesById: Map<string, GraphNode>;
  typesByRecordTypeId: Map<string, GraphTypeDef>;
  outgoing: Map<string, Set<string>>;
  incoming: Map<string, Set<string>>;

  constructor(
    nodesById = new Map<string, GraphNode>(),
    typesByRecordTypeId = new Map<string, GraphTypeDef>(),
    outgoing = new Map<string, Set<string>>(),
    incoming = new Map<string, Set<string>>()
  ) {
    this.nodesById = nodesById;
    this.typesByRecordTypeId = typesByRecordTypeId;
    this.outgoing = outgoing;
    this.incoming = incoming;
  }

  getLinksFrom(id: string): string[] {
    return sortedSet(this.outgoing.get(id));
  }

  getLinksTo(id: string): string[] {
    return sortedSet(this.incoming.get(id));
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
    return node.typeId;
  }

  getTypeForRecord(id: string): GraphTypeDef | null {
    const recordTypeId = this.getRecordTypeId(id);
    if (!recordTypeId) {
      return null;
    }
    return this.typesByRecordTypeId.get(recordTypeId) ?? null;
  }
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
    return {
      ok: false,
      error: makeError(code, message, file)
    };
  }

  try {
    const yamlObj = parseYamlObject(yaml);
    return { ok: true, yaml: yamlObj, body };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const code =
      message === 'YAML front matter is not a valid object'
        ? 'E_YAML_NOT_OBJECT'
        : 'E_YAML_INVALID';
    return {
      ok: false,
      error: makeError(code, message, file)
    };
  }
}

export function extractYamlRefs(fields: unknown): string[] {
  const results: string[] = [];

  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!isObject(value)) {
      return;
    }
    for (const [key, entry] of Object.entries(value)) {
      if (key === 'ref' || key === 'refs') {
        results.push(...normalizeRefs(entry));
      }
      visit(entry);
    }
  };

  visit(fields);
  return results;
}

export function buildGraphFromFs(
  rootDir: string
):
  | { ok: true; graph: Graph }
  | { ok: false; errors: ValidationError[] } {
  const snapshot = loadRepoSnapshotFromFs(rootDir);
  return buildGraphFromSnapshot(snapshot);
}

export function buildGraphFromSnapshot(
  snapshot: RepoSnapshot
):
  | { ok: true; graph: Graph }
  | { ok: false; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  const nodesById = new Map<string, GraphNode>();
  const typesByRecordTypeId = new Map<string, GraphTypeDef>();
  const outgoing = new Map<string, Set<string>>();
  const incoming = new Map<string, Set<string>>();

  const markdownFiles = [...snapshot.files.keys()]
    .filter((file) => file.toLowerCase().endsWith('.md'))
    .filter((file) => isGraphRecordPath(file))
    .sort((a, b) => a.localeCompare(b));

  const recordTypeIdPattern = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

  for (const file of markdownFiles) {
    const text = getTextFile(snapshot, file);
    const parsed = parseMarkdownRecord(text, file);
    if (!parsed.ok) {
      errors.push(parsed.error);
      continue;
    }
    const { yaml, body } = parsed;
    const id = getString(yaml, 'id');
    if (!id) {
      continue;
    }
    if (nodesById.has(id)) {
      errors.push(
        makeError(
          'E_DUPLICATE_ID',
          `Duplicate id detected: ${id} (in ${file})`,
          file
        )
      );
      continue;
    }

    const fields = isObject(yaml.fields) ? (yaml.fields as Record<string, unknown>) : {};
    const kind = getKindForPath(file);
    const node: GraphNode = {
      id,
      datasetId: getString(yaml, 'datasetId') ?? '',
      typeId: getString(yaml, 'typeId') ?? '',
      createdAt: getString(yaml, 'createdAt') ?? '',
      updatedAt: getString(yaml, 'updatedAt') ?? '',
      fields,
      body,
      file,
      kind
    };
    nodesById.set(id, node);

    if (kind === 'type') {
      const recordTypeId = fields.recordTypeId;
      if (typeof recordTypeId !== 'string') {
        errors.push(
          makeError(
            'E_REQUIRED_FIELD_MISSING',
            'Type record fields must include recordTypeId',
            file
          )
        );
        continue;
      }
      if (!recordTypeIdPattern.test(recordTypeId)) {
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
            `Multiple types define recordTypeId ${recordTypeId}`,
            file
          )
        );
        continue;
      }
      typesByRecordTypeId.set(recordTypeId, {
        recordTypeId,
        typeRecordId: id,
        file,
        fields,
        displayName: typeof fields.name === 'string' ? fields.name : undefined
      });
    }
  }

  for (const node of nodesById.values()) {
    const yamlRefs = extractYamlRefs(node.fields);
    const wikiLinks = extractWikiLinks(node.body);
    const links = uniqueLinks([...yamlRefs, ...wikiLinks], node.id);
    if (links.length === 0) {
      continue;
    }
    outgoing.set(node.id, new Set(links));
    for (const target of links) {
      const sources = incoming.get(target) ?? new Set<string>();
      sources.add(node.id);
      incoming.set(target, sources);
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    graph: new Graph(nodesById, typesByRecordTypeId, outgoing, incoming)
  };
}

function sortedSet(values?: Set<string>): string[] {
  if (!values) {
    return [];
  }
  return [...values].sort((a, b) => a.localeCompare(b));
}

function uniqueLinks(values: string[], selfId: string): string[] {
  const unique = new Set(
    values.filter((value) => value && value !== selfId)
  );
  return [...unique];
}

function isGraphRecordPath(file: string): boolean {
  return (
    file.startsWith('datasets/') ||
    file.startsWith('types/') ||
    file.startsWith('records/')
  );
}

function getKindForPath(file: string): GraphNodeKind {
  if (file.startsWith('datasets/')) {
    return 'dataset';
  }
  if (file.startsWith('types/')) {
    return 'type';
  }
  return 'record';
}
