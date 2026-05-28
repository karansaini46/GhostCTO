import type { ReactNode } from 'react';
import { FileText } from 'lucide-react';

import { cn } from '../../lib/cn';

export type EmptyStateProps = {
  action?: ReactNode;
  className?: string;
  description?: string;
  title: string;
};

export const EmptyState = ({ action, className, description, title }: EmptyStateProps) => (
  <div
    className={cn(
      'flex min-h-48 flex-col items-center justify-center rounded-panel border border-dashed border-border bg-surface-card px-6 py-10 text-center shadow-sm',
      className,
    )}
  >
    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-accent/20 bg-accent-soft text-accent">
      <FileText className="h-5 w-5" />
    </div>
    <h2 className="text-lg font-semibold tracking-normal text-text">{title}</h2>
    {description ? (
      <p className="mt-2 max-w-md text-sm leading-6 text-secondary">{description}</p>
    ) : null}
    {action ? <div className="mt-5">{action}</div> : null}
  </div>
);
