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
  const recordFields = record.fields ?? {};
  const fieldsYaml = YAML.stringify(recordFields, { indent: 2 });
  const typeFields = typeDef.fields ?? {};

  const fieldDefsRaw = isObject(typeFields) ? typeFields.fieldDefs : undefined;
  const fieldDefs = isObject(fieldDefsRaw) ? fieldDefsRaw : {};
  const fieldEntries = Object.entries(recordFields);

  const formatValue = (value: unknown) => {
    if (value === null || value === undefined) return String(value);
    if (typeof value === "string") return value;
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  };

  return (
    <div className="record-card">
      <p>
        <strong>{record.recordId}</strong>
      </p>
      <p>Type: {typeDef.typeId}</p>
      <div>
        <h3>Rendered Fields</h3>
        {fieldEntries.length ? (
          <ul>
            {fieldEntries.map(([fieldName, value]) => {
              const fieldDef = isObject(fieldDefs[fieldName]) ? fieldDefs[fieldName] : {};
              const kind = typeof fieldDef.kind === "string" ? fieldDef.kind : undefined;
              const rendered =
                uiPlugins?.renderField({
                  typeId: typeDef.typeId,
                  recordId: record.recordId,
                  recordKey: record.recordKey,
                  fieldName,
                  kind,
                  value,
                  recordFields,
                  typeFields
                }) ?? null;
              return (
                <li key={fieldName} data-testid={`rendered-field-${fieldName}`}>
                  <strong>{fieldName}:</strong> {rendered ?? formatValue(value)}
                </li>
              );
            })}
          </ul>
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
