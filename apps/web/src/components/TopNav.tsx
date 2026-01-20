import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";

type ThemeMode = "light" | "dark";

const STORAGE_KEY = "graphdown-theme";

const getInitialTheme = (): ThemeMode => {
  if (typeof window === "undefined") {
    return "light";
  }

  const storedTheme = window.localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export default function TopNav() {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"));
  };

  return (
    <nav className="top-nav" data-testid="topnav">
      <div className="top-nav__brand">Graphdown</div>
      <div className="top-nav__actions">
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
        <button className="theme-toggle" type="button" onClick={toggleTheme}>
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
      </div>
    </nav>
  );
}
