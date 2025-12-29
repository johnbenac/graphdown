import { NavLink } from "react-router-dom";

export default function TopNav() {
  return (
    <nav className="top-nav" data-testid="topnav">
      <div className="top-nav__brand">Graphdown</div>
      <div className="top-nav__links">
        <NavLink className="top-nav__link" to="/import">
          Import
        </NavLink>
        <NavLink className="top-nav__link" to="/datasets">
          Datasets
        </NavLink>
        <NavLink className="top-nav__link" to="/export">
          Export
        </NavLink>
      </div>
    </nav>
  );
}
