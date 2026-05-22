import type { ReactNode } from 'react';

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
      'flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface px-6 py-10 text-center',
      className,
    )}
  >
    <div className="mb-4 h-10 w-10 rounded-full border border-border bg-surface-raised" />
    <h2 className="text-base font-semibold tracking-normal text-text">{title}</h2>
    {description ? (
      <p className="mt-2 max-w-md text-sm leading-6 text-muted">{description}</p>
    ) : null}
    {action ? <div className="mt-5">{action}</div> : null}
  </div>
);
