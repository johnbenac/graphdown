import YAML from "yaml";
import type { GraphRecordNode, GraphTypeNode } from "../core/graph";
import { isObject } from "../core/types";
import type { UiPluginHost } from "../uiPlugins/host";

type RecordViewerProps = {
  record: GraphRecordNode;
  typeDef: GraphTypeNode;
  outgoingLinks: string[];
  incomingLinks: string[];
  uiPlugins?: UiPluginHost | null;
};

export default function RecordViewer({
  record,
  typeDef,
  outgoingLinks,
  incomingLinks,
  uiPlugins
}: RecordViewerProps) {
  const bodyValue = record.body ?? "";
  const fieldsYaml = YAML.stringify(record.fields ?? {}, { indent: 2 });
  const recordFields = record.fields ?? {};
  const typeFields = isObject(typeDef.fields) ? typeDef.fields : {};
  const fieldDefs = isObject(typeFields.fieldDefs) ? typeFields.fieldDefs : {};
  const renderedFieldEntries = Object.entries(recordFields);

  const getFallbackValue = (value: unknown) => {
    if (typeof value === "string") {
      return value;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    try {
      return JSON.stringify(value);
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
        {renderedFieldEntries.length ? (
          <ul>
            {renderedFieldEntries.map(([fieldName, value]) => {
              const fieldDef = isObject(fieldDefs[fieldName]) ? fieldDefs[fieldName] : undefined;
              const kind = fieldDef && typeof fieldDef.kind === "string" ? fieldDef.kind : undefined;
              const rendered = uiPlugins?.renderField({
                typeId: record.typeId,
                recordId: record.recordId,
                recordKey: record.recordKey,
                fieldName,
                kind,
                value,
                recordFields,
                typeFields
              });
              const fallback = getFallbackValue(value);
              return (
                <li key={fieldName} data-testid={`rendered-field-${fieldName}`}>
                  <strong>{fieldName}:</strong> {rendered ?? fallback}
                </li>
              );
            })}
          </ul>
        ) : (
          <p>No fields.</p>
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
