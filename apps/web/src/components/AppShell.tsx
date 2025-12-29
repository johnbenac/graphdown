import { ReactNode } from "react";
import TopNav from "./TopNav";

type AppShellProps = {
  children: ReactNode;
  sidebar?: ReactNode;
};

const AppShell = ({ children, sidebar }: AppShellProps) => {
  return (
    <div className="app">
      <TopNav />
      <div className="app-body">
        {sidebar ? <aside className="sidebar">{sidebar}</aside> : null}
        <main className="main">{children}</main>
      </div>
    </div>
  );
};

export default AppShell;
