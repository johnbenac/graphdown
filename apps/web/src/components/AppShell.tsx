import type { ReactNode } from "react";
import TopNav from "./TopNav";

interface AppShellProps {
  sidebar?: ReactNode;
  children: ReactNode;
}

export default function AppShell({ sidebar, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <TopNav />
      <div className="main-layout">
        <aside className="sidebar">{sidebar}</aside>
        <main className="panel">{children}</main>
      </div>
    </div>
  );
}
