import type { GraphNode, GraphTypeDef } from "../../../../src/core/graph";
import { isObject } from "../../../../src/core/types";
import { readRef, readRefs, type TypeSchema } from "../schema/typeSchema";

type RecordViewerProps = {
  record: GraphNode;
  typeDef: GraphTypeDef;
  schema: TypeSchema | null;
  outgoingLinks: string[];
  incomingLinks: string[];
  onEdit: () => void;
};

function formatFieldValue(kind: string, value: unknown): string {
  if (kind === "ref") {
    return readRef(value);
  }
  if (kind === "ref[]") {
    return readRefs(value).join(", ");
  }
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  return JSON.stringify(value);
}

export default function RecordViewer({
  record,
  typeDef,
  schema,
  outgoingLinks,
  incomingLinks,
  onEdit
}: RecordViewerProps) {
  const bodyFieldName = schema?.bodyField;
  const bodyLabel =
    schema?.fields.find((field) => field.name === bodyFieldName)?.label ?? bodyFieldName ?? "Body";
  let bodyValue = record.body || "";
  if (!bodyValue && bodyFieldName && isObject(record.fields) && typeof record.fields[bodyFieldName] === "string") {
    bodyValue = record.fields[bodyFieldName] as string;
  }

  return (
    <div className="record-card">
      <div className="record-card__header">
        <div>
          <p>
            <strong>{record.id}</strong>
          </p>
          <p>Type: {typeDef.recordTypeId}</p>
          <p>Created: {record.createdAt}</p>
          <p>Updated: {record.updatedAt}</p>
        </div>
        <button type="button" className="button secondary" data-testid="edit-record" onClick={onEdit}>
          Edit
        </button>
      </div>
      <div>
        <h3>Fields</h3>
        {schema ? (
          schema.fields.length ? (
            <dl className="record-fields">
              {schema.fields
                .filter((field) => field.name !== bodyFieldName)
                .map((field) => {
                  const rawValue = record.fields?.[field.name];
                  const label = field.label ?? field.name;
                  const formatted = formatFieldValue(field.kind, rawValue);
                  return (
                    <div key={field.name} className="record-field">
                      <dt>{label}</dt>
                      <dd data-testid={`field-${field.name}`}>{formatted || "—"}</dd>
                    </div>
                  );
                })}
            </dl>
          ) : (
            <p>No schema fields defined.</p>
          )
        ) : (
          <p>Schema definition is invalid.</p>
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
