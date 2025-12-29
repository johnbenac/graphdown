import { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

const EmptyState = ({ title, description, action }: EmptyStateProps) => {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <span>{description}</span>
      {action ? <div>{action}</div> : null}
    </div>
  );
};

export default EmptyState;
