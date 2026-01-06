import YAML from "yaml";
import type { GraphRecordNode, GraphTypeNode } from "../core/graph";
import { isObject } from "../core/types";
import { useDataset } from "../state/DatasetContext";

type RecordViewerProps = {
  record: GraphRecordNode;
  typeDef: GraphTypeNode;
  outgoingLinks: string[];
  incomingLinks: string[];
};

export default function RecordViewer({
  record,
  typeDef,
  outgoingLinks,
  incomingLinks
}: RecordViewerProps) {
  const { uiPlugins } = useDataset();
  const bodyValue = record.body ?? "";
  const fieldsYaml = YAML.stringify(record.fields ?? {}, { indent: 2 });
  const recordFields = record.fields ?? {};
  const fieldDefs = isObject(typeDef.fields) ? typeDef.fields.fieldDefs : undefined;
  const fieldDefsMap = isObject(fieldDefs) ? fieldDefs : null;

  const renderValue = (value: unknown) => {
    if (typeof value === "string") {
      return value;
    }
    const json = JSON.stringify(value);
    return json ?? String(value);
  };

  return (
    <div className="record-card">
      <p>
        <strong>{record.recordId}</strong>
      </p>
      <p>Type: {typeDef.typeId}</p>
      <div>
        <h3>Rendered Fields</h3>
        {Object.entries(recordFields).length ? (
          <div className="record-rendered-fields">
            {Object.entries(recordFields).map(([fieldName, value]) => {
              const fieldDef = fieldDefsMap?.[fieldName];
              const kind =
                fieldDef && isObject(fieldDef) && typeof fieldDef.kind === "string"
                  ? fieldDef.kind
                  : undefined;
              const rendered = uiPlugins?.renderField({
                typeId: record.typeId,
                recordId: record.recordId,
                recordKey: record.recordKey,
                fieldName,
                kind,
                value,
                recordFields,
                typeFields: typeDef.fields
              });
              return (
                <div key={fieldName} data-testid={`rendered-field-${fieldName}`}>
                  <strong>{fieldName}:</strong> {rendered ?? renderValue(value)}
                </div>
              );
            })}
          </div>
        ) : (
          <p>(no fields)</p>
        )}
      </div>
      <div>
        <h3>Fields</h3>
        <pre>{fieldsYaml}</pre>
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
