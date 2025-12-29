import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  children?: ReactNode;
}

export default function EmptyState({ title, children }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      {children}
    </div>
  );
}
