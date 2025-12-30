import type { Graph, GraphNode } from "../../../../src/core/graph";
import { readRef, readRefs, type TypeSchema } from "../schema/typeSchema";

type RecordViewerProps = {
  record: GraphNode;
  schema: TypeSchema;
  graph: Graph;
  onEdit: () => void;
};

function getFieldLabel(name: string, label?: string) {
  return label ?? name;
}

function getBodyValue(record: GraphNode, schema: TypeSchema): string {
  if (record.body) {
    return record.body;
  }
  if (schema.bodyField) {
    const fallback = record.fields?.[schema.bodyField];
    return typeof fallback === "string" ? fallback : "";
  }
  return "";
}

export default function RecordViewer({ record, schema, graph, onEdit }: RecordViewerProps) {
  const bodyFieldName = schema.bodyField;
  const bodyFieldDef = schema.fields.find((field) => field.name === bodyFieldName);
  const fieldDefs = schema.fields.filter((field) => field.name !== bodyFieldName);
  const outgoingLinks = graph.getLinksFrom(record.id);
  const incomingLinks = graph.getLinksTo(record.id);
  const bodyValue = getBodyValue(record, schema);

  return (
    <div className="record-card">
      <div className="record-actions">
        <button type="button" className="button" data-testid="edit-record" onClick={onEdit}>
          Edit
        </button>
      </div>
      <p>
        <strong>{record.id}</strong>
      </p>
      <p>Type: {record.typeId}</p>
      <p>Created: {record.createdAt}</p>
      <p>Updated: {record.updatedAt}</p>
      <div>
        <h3>Fields</h3>
        {fieldDefs.length ? (
          <dl className="record-fields">
            {fieldDefs.map((field) => {
              const value = record.fields?.[field.name];
              const refs = field.kind === "ref[]" ? readRefs(value) : [];
              return (
                <div key={field.name} className="record-field">
                  <dt>{getFieldLabel(field.name, field.label)}</dt>
                  <dd>
                    {field.kind === "ref" ? (
                      readRef(value) || <em>None</em>
                    ) : field.kind === "ref[]" ? (
                      refs.length ? (
                        <ul>
                          {refs.map((ref) => (
                            <li key={ref}>{ref}</li>
                          ))}
                        </ul>
                      ) : (
                        <em>None</em>
                      )
                    ) : value === undefined || value === null || value === "" ? (
                      <em>None</em>
                    ) : (
                      String(value)
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>
        ) : (
          <p>No schema fields defined.</p>
        )}
      </div>
      <div>
        <h3>{bodyFieldDef ? getFieldLabel(bodyFieldDef.name, bodyFieldDef.label) : "Body"}</h3>
        <pre>{bodyValue || "(no body)"}</pre>
      </div>
      <div className="record-links">
        <div>
          <h3>Outgoing links</h3>
          <ul>
            {outgoingLinks.length ? outgoingLinks.map((link) => <li key={link}>{link}</li>) : <li>None</li>}
          </ul>
        </div>
        <div>
          <h3>Incoming links</h3>
          <ul>
            {incomingLinks.length ? incomingLinks.map((link) => <li key={link}>{link}</li>) : <li>None</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
