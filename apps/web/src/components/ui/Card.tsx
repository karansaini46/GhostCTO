import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '../../lib/cn';

export type CardProps = ComponentPropsWithoutRef<'div'>;
type CardTitleProps = ComponentPropsWithoutRef<'h2'>;
type CardDescriptionProps = ComponentPropsWithoutRef<'p'>;

export const Card = ({ className, ...props }: CardProps) => (
  <div
    className={cn('rounded-lg border border-border bg-surface shadow-panel', className)}
    {...props}
  />
);

export const CardHeader = ({ className, ...props }: CardProps) => (
  <div className={cn('space-y-1.5 p-5 pb-0', className)} {...props} />
);

export const CardTitle = ({ className, ...props }: CardTitleProps) => (
  <h2 className={cn('text-base font-semibold tracking-normal text-text', className)} {...props} />
);

export const CardDescription = ({ className, ...props }: CardDescriptionProps) => (
  <p className={cn('text-sm leading-6 text-muted', className)} {...props} />
);

export const CardContent = ({ className, ...props }: CardProps) => (
  <div className={cn('p-5', className)} {...props} />
);

export const CardFooter = ({ className, ...props }: CardProps) => (
  <div
    className={cn(
      'flex items-center justify-end gap-3 border-t border-border px-5 py-4',
      className,
    )}
    {...props}
  />
);
