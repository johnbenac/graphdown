import YAML from "yaml";
import type { GraphRecordNode, GraphTypeNode } from "../core/graph";
import { isObject } from "../core/types";
import type { FieldViewContext, UiPluginHost } from "../uiPlugins/types";

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
  const typeFields = typeDef.fields ?? {};

  const fieldDefs = isObject(typeFields) ? typeFields.fieldDefs : null;
  const resolvedFieldDefs = isObject(fieldDefs) ? (fieldDefs as Record<string, unknown>) : null;

  const fieldEntries = Object.entries(recordFields ?? {}).sort(([a], [b]) => a.localeCompare(b));

  const renderFallback = (value: unknown) => {
    if (typeof value === "string") {
      return value;
    }
    if (typeof value === "number" || typeof value === "boolean" || value === null) {
      return String(value);
    }
    return <pre>{JSON.stringify(value, null, 2)}</pre>;
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
          <div className="record-rendered-fields">
            {fieldEntries.map(([fieldName, value]) => {
              const fieldDef = resolvedFieldDefs ? resolvedFieldDefs[fieldName] : null;
              const kind =
                fieldDef && isObject(fieldDef) && typeof fieldDef.kind === "string"
                  ? fieldDef.kind
                  : undefined;
              const ctx: FieldViewContext = {
                typeId: typeDef.typeId,
                recordId: record.recordId,
                recordKey: record.recordKey,
                fieldName,
                kind,
                value,
                recordFields,
                typeFields
              };
              const rendered = uiPlugins?.renderField(ctx) ?? null;
              return (
                <div key={fieldName} data-testid={`rendered-field-${fieldName}`}>
                  <strong>{fieldName}:</strong> {rendered ?? renderFallback(value)}
                </div>
              );
            })}
          </div>
        ) : (
          <p>(no fields)</p>
        )}
      </div>
      <div>
        <h3>Fields (raw YAML)</h3>
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
