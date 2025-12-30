import type { Graph, GraphNode } from "../../../../src/core/graph";
import type { TypeSchema } from "../schema/typeSchema";
import { readRef, readRefs } from "../schema/typeSchema";

type RecordViewerProps = {
  record: GraphNode;
  schema?: TypeSchema;
  graph: Graph;
};

function renderFieldValue(kind: string, value: unknown) {
  if (kind === "ref") {
    const ref = readRef(value);
    return ref || "(empty)";
  }
  if (kind === "ref[]") {
    const refs = readRefs(value);
    return refs.length ? refs.join(", ") : "(empty)";
  }
  if (value === undefined || value === null || value === "") {
    return "(empty)";
  }
  return String(value);
}

export default function RecordViewer({ record, schema, graph }: RecordViewerProps) {
  const outgoingLinks = graph.getLinksFrom(record.id);
  const incomingLinks = graph.getLinksTo(record.id);
  const bodyField = schema?.bodyField;
  const bodyLabel =
    schema?.fields.find((field) => field.name === bodyField)?.label ?? bodyField ?? "Body";
  const bodyValue =
    record.body || (bodyField && typeof record.fields[bodyField] === "string" ? record.fields[bodyField] : "");

  return (
    <div className="record-card">
      <p>
        <strong>{record.id}</strong>
      </p>
      <p>Type: {record.typeId}</p>
      <p>Created: {record.createdAt}</p>
      <p>Updated: {record.updatedAt}</p>
      <div className="record-fields">
        <h3>Fields</h3>
        {schema?.fields.length ? (
          <dl>
            {schema.fields
              .filter((field) => field.name !== bodyField)
              .map((field) => (
                <div key={field.name} className="record-field-row">
                  <dt>{field.label ?? field.name}</dt>
                  <dd>{renderFieldValue(field.kind, record.fields[field.name])}</dd>
                </div>
              ))}
          </dl>
        ) : (
          <pre>{JSON.stringify(record.fields, null, 2)}</pre>
        )}
      </div>
      <div>
        <h3>{bodyLabel}</h3>
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
