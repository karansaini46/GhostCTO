import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

import { cn } from '../../lib/cn';

export type ErrorStateProps = {
  action?: ReactNode;
  className?: string;
  description?: string;
  title: string;
};

export const ErrorState = ({ action, className, description, title }: ErrorStateProps) => (
  <div
    className={cn(
      'rounded-panel border border-danger/25 bg-danger/10 p-4 text-danger shadow-sm sm:p-5',
      className,
    )}
  >
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="text-sm font-semibold">{title}</p>
          {description ? (
            <p className="mt-1 text-sm leading-6 text-secondary">{description}</p>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  </div>
);
