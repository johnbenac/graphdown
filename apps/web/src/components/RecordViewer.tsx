import YAML from "yaml";
import type { GraphRecordNode, GraphTypeNode } from "../../../../src/core/graph";

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
  const bodyValue = record.body ?? "";
  const fieldsYaml = YAML.stringify(record.fields ?? {}, { indent: 2 });

  return (
    <div className="record-card">
      <p>
        <strong>{record.recordId}</strong>
      </p>
      <p>Type: {typeDef.typeId}</p>
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
