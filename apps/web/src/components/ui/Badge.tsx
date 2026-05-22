import type { HTMLAttributes } from 'react';

import { cn } from '../../lib/cn';

type BadgeVariant = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

const variants: Record<BadgeVariant, string> = {
  accent: 'border-accent/35 bg-accent/10 text-accent',
  danger: 'border-danger/35 bg-danger/10 text-danger',
  neutral: 'border-border bg-surface-raised text-muted',
  success: 'border-success/35 bg-success/10 text-success',
  warning: 'border-warning/35 bg-warning/10 text-warning',
};

export const Badge = ({ className, variant = 'neutral', ...props }: BadgeProps) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium tracking-normal',
      variants[variant],
      className,
    )}
    {...props}
  />
);
