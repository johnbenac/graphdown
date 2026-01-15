import { NavLink } from "react-router-dom";
import type { RuntimeTypeViewV1 } from "@graphdown/runtime";

type TypeNavProps = {
  types: RuntimeTypeViewV1[];
  counts?: Map<string, number>;
  basePath?: string;
};

export function getTypeLabel(type: RuntimeTypeViewV1): string {
  const fields = type.fields ?? {};
  const pluralName = typeof fields.pluralName === "string" ? fields.pluralName : null;
  const displayName = typeof fields.displayName === "string" ? fields.displayName : null;
  const name = typeof fields.name === "string" ? fields.name : null;
  return pluralName ?? displayName ?? name ?? type.typeId;
}

export default function TypeNav({ types, counts, basePath = "/datasets" }: TypeNavProps) {
  const sortedTypes = [...types].sort((a, b) => a.typeId.localeCompare(b.typeId));

  const normalizedBasePath = basePath.replace(/\/$/, "");

  return (
    <nav className="type-nav" aria-label="Types" data-testid="type-nav">
      <div className="type-nav__header">Types</div>
      <ul className="type-nav__list">
        {sortedTypes.map((type) => (
          <li key={type.typeId}>
            <NavLink
              className={({ isActive }) => (isActive ? "type-nav__link active" : "type-nav__link")}
              to={`${normalizedBasePath}/${type.typeId}`}
            >
              <span className="type-nav__label">{getTypeLabel(type)}</span>
              <span className="type-nav__count">
                {counts ? counts.get(type.typeId) ?? 0 : "…"}
              </span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
