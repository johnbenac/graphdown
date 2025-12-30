import type { GraphNode, GraphTypeDef } from "../../../../src/core/graph";
import type { TypeSchema, FieldDef } from "../schema/typeSchema";
import { readRef, readRefs } from "../schema/typeSchema";

type RecordViewerProps = {
  record: GraphNode;
  typeDef: GraphTypeDef;
  schema?: TypeSchema;
  schemaError?: string;
  outgoingLinks: string[];
  incomingLinks: string[];
};

function getFieldLabel(field: FieldDef) {
  return field.label ?? field.name;
}

function getBodyValue(record: GraphNode, bodyField?: string) {
  if (record.body) {
    return record.body;
  }
  if (bodyField && typeof record.fields[bodyField] === "string") {
    return String(record.fields[bodyField]);
  }
  return "";
}

function formatFieldValue(field: FieldDef, value: unknown): string | string[] {
  switch (field.kind) {
    case "number":
      return value === undefined || value === null ? "" : String(value);
    case "enum":
    case "string":
    case "date":
      return typeof value === "string" || typeof value === "number" ? String(value) : "";
    case "ref":
      return readRef(value);
    case "ref[]":
      return readRefs(value);
    default:
      return "";
  }
}

export default function RecordViewer({
  record,
  typeDef,
  schema,
  schemaError,
  outgoingLinks,
  incomingLinks
}: RecordViewerProps) {
  const bodyField = schema?.bodyField;
  const bodyValue = getBodyValue(record, bodyField);
  const schemaFields = schema?.fields ?? [];
  const fieldValues = schemaFields.filter((field) => field.name !== bodyField);
  const renderedFields = fieldValues.map((field) => ({
    field,
    value: formatFieldValue(field, record.fields[field.name])
  }));
  const extraFields = schema
    ? Object.keys(record.fields).filter(
        (key) => !schemaFields.some((field) => field.name === key) && key !== bodyField
      )
    : Object.keys(record.fields);
  const extraFieldData = extraFields.reduce<Record<string, unknown>>((acc, key) => {
    acc[key] = record.fields[key];
    return acc;
  }, {});

  return (
    <div className="record-card">
      <p>
        <strong>{record.id}</strong>
      </p>
      <p>Type: {typeDef.recordTypeId}</p>
      <p>Created: {record.createdAt}</p>
      <p>Updated: {record.updatedAt}</p>
      {schemaError ? <div className="form-error">{schemaError}</div> : null}
      <div>
        <h3>Fields</h3>
        {renderedFields.length ? (
          <div className="record-field-list">
            {renderedFields.map(({ field, value }) => (
              <div key={field.name} className="record-field">
                <div className="record-field__label">{getFieldLabel(field)}</div>
                {Array.isArray(value) ? (
                  value.length ? (
                    <ul className="record-field__list">
                      {value.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <div className="record-field__value">(empty)</div>
                  )
                ) : (
                  <div className="record-field__value">{value || "(empty)"}</div>
                )}
              </div>
            ))}
          </div>
        ) : schema ? (
          <p>No schema fields defined.</p>
        ) : (
          <pre>{JSON.stringify(record.fields, null, 2)}</pre>
        )}
        {extraFields.length ? (
          <div className="record-field-extra">
            <h4>Other fields</h4>
            <pre>{JSON.stringify(extraFieldData, null, 2)}</pre>
          </div>
        ) : null}
      </div>
      <div>
        <h3>Body</h3>
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
