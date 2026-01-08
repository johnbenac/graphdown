import YAML from "yaml";
import type { GraphTypeNode } from "../graphdown/graph/graph";
import { getTypeLabel } from "./TypeNav";

type TypeViewerProps = {
  typeDef: GraphTypeNode;
};

export default function TypeViewer({ typeDef }: TypeViewerProps) {
  const fieldsYaml = YAML.stringify(typeDef.fields ?? {}, { indent: 2 });
  const bodyValue = typeDef.body ?? "";

  return (
    <div className="type-card">
      <p>
        <strong>{getTypeLabel(typeDef)}</strong>
      </p>
      <p>ID: {typeDef.typeId}</p>
      <div>
        <h3>Fields</h3>
        <pre data-testid="type-fields">{fieldsYaml}</pre>
      </div>
      <div>
        <h3>Type body</h3>
        <pre data-testid="type-body">{bodyValue || "(no body)"}</pre>
      </div>
    </div>
  );
}
