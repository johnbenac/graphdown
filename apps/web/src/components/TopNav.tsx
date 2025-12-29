import { NavLink } from "react-router-dom";

const TopNav = () => {
  return (
    <header className="topnav" data-testid="topnav">
      <div>
        <strong>Graphdown</strong>
        <div className="badge">Web</div>
      </div>
      <nav className="topnav-links">
        <NavLink to="/import">Import</NavLink>
        <NavLink to="/datasets">Datasets</NavLink>
      </nav>
    </header>
  );
};

export default TopNav;
