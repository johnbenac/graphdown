import { NavLink } from "react-router-dom";
import type { Graph } from "../../../../src/core/graph";
import { getTypeLabel } from "../utils/typeLabels";

const defaultBasePath = "/datasets";

type TypeNavProps = {
  graph: Graph;
  basePath?: string;
};

export default function TypeNav({ graph, basePath = defaultBasePath }: TypeNavProps) {
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

  const normalizedBasePath = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;

  return (
    <nav aria-label="Types" className="type-nav" data-testid="type-nav">
      <div className="type-nav__header">Types</div>
      <ul className="type-nav__list">
        {types.map((type) => (
          <li key={type.recordTypeId}>
            <NavLink className="type-nav__link" to={`${normalizedBasePath}/${type.recordTypeId}`}>
              <span>{getTypeLabel(type)}</span>
              <span className="type-nav__count">{counts.get(type.recordTypeId) ?? 0}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
