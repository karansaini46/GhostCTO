import type { ReactNode } from 'react';

import { cn } from '../../lib/cn';

export type DocumentSectionProps = {
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  eyebrow?: string;
  title: string;
};

export const DocumentSection = ({
  action,
  children,
  className,
  eyebrow,
  title,
}: DocumentSectionProps) => (
  <section className={cn('border-t border-subtle py-6 first:border-t-0 first:pt-0', className)}>
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div>
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">{eyebrow}</p>
        ) : null}
        <h2 className="font-editorial text-2xl font-semibold tracking-normal text-text">{title}</h2>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
    <div className="text-sm leading-7 text-secondary">{children}</div>
  </section>
);
