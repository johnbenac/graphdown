import type { ReactNode } from "react";

interface PanelProps {
  title: string;
  children: ReactNode;
}

export default function Panel({ title, children }: PanelProps) {
  return (
    <section className="panel">
      <h1>{title}</h1>
      {children}
    </section>
  );
}
