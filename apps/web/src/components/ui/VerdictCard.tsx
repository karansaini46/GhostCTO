import type { ReactNode } from 'react';

import { cn } from '../../lib/cn';

type VerdictTone = 'neutral' | 'success' | 'warning' | 'danger' | 'accent';

export type VerdictCardProps = {
  children?: ReactNode;
  className?: string;
  label?: string;
  tone?: VerdictTone;
  title: string;
};

const tones: Record<VerdictTone, string> = {
  accent: 'border-accent/25 bg-accent-soft text-accent',
  danger: 'border-danger/30 bg-danger/10 text-danger',
  neutral: 'border-subtle bg-surface-card text-text',
  success: 'border-success/30 bg-success/10 text-success',
  warning: 'border-warning/30 bg-warning/10 text-warning',
};

export const VerdictCard = ({
  children,
  className,
  label = 'Verdict',
  title,
  tone = 'neutral',
}: VerdictCardProps) => (
  <div className={cn('rounded-panel border p-5 shadow-soft', tones[tone], className)}>
    <p className="text-xs font-semibold uppercase tracking-[0.14em] opacity-80">{label}</p>
    <p className="mt-2 text-2xl font-semibold tracking-normal">{title}</p>
    {children ? <div className="mt-3 text-sm leading-6 text-text">{children}</div> : null}
  </div>
);
