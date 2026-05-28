import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '../../lib/cn';

type SurfaceTone = 'default' | 'soft' | 'elevated' | 'accent' | 'warning' | 'danger' | 'success';

export type SurfaceProps = ComponentPropsWithoutRef<'div'> & {
  tone?: SurfaceTone;
};

const tones: Record<SurfaceTone, string> = {
  accent: 'border-accent/20 bg-accent-soft text-text',
  danger: 'border-danger/25 bg-danger/10 text-text',
  default: 'border-subtle bg-surface-card text-text',
  elevated: 'border-subtle bg-surface-elevated text-text shadow-soft',
  soft: 'border-subtle bg-surface-raised text-text',
  success: 'border-success/25 bg-success/10 text-text',
  warning: 'border-warning/25 bg-warning/10 text-text',
};

export const Surface = ({ className, tone = 'default', ...props }: SurfaceProps) => (
  <div className={cn('rounded-panel border p-4 sm:p-5', tones[tone], className)} {...props} />
);
