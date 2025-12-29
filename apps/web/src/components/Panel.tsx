import { ReactNode } from "react";

type PanelProps = {
  title?: string;
  children: ReactNode;
};

const Panel = ({ title, children }: PanelProps) => {
  return (
    <section className="panel">
      {title ? <h2 className="panel-title">{title}</h2> : null}
      {children}
    </section>
  );
};

export default Panel;
