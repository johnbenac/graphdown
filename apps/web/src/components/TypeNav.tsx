import { NavLink } from "react-router-dom";
import type { Graph, GraphTypeDef } from "../../../../src/core/graph";

const DEFAULT_BASE_PATH = "/datasets";

export function getTypeLabel(type: GraphTypeDef): string {
  const fields = type.fields ?? {};
  const pluralName = typeof fields.pluralName === "string" ? fields.pluralName : null;
  const displayName = typeof fields.displayName === "string" ? fields.displayName : null;
  const name = typeof fields.name === "string" ? fields.name : null;
  return pluralName ?? displayName ?? name ?? type.recordTypeId;
}

interface TypeNavProps {
  graph: Graph;
  basePath?: string;
}

export default function TypeNav({ graph, basePath = DEFAULT_BASE_PATH }: TypeNavProps) {
  const types = [...graph.typesByRecordTypeId.values()].sort((a, b) =>
    a.recordTypeId.localeCompare(b.recordTypeId)
  );

  const counts = new Map<string, number>();
  for (const node of graph.nodesById.values()) {
    if (node.kind !== "record") {
      continue;
    }
    counts.set(node.typeId, (counts.get(node.typeId) ?? 0) + 1);
  }

  return (
    <nav className="type-nav" aria-label="Types" data-testid="type-nav">
      <div className="type-nav__header">Types</div>
      <ul className="type-nav__list">
        {types.map((type) => {
          const label = getTypeLabel(type);
          const count = counts.get(type.recordTypeId) ?? 0;
          return (
            <li key={type.recordTypeId}>
              <NavLink className="type-nav__link" to={`${basePath}/${type.recordTypeId}`}>
                <span>{label}</span>
                <span className="type-nav__count">{count}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
