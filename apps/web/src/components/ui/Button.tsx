import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '../../lib/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  isLoading?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

const variants: Record<ButtonVariant, string> = {
  danger:
    'border-danger/35 bg-danger/10 text-danger hover:bg-danger/20 focus-visible:ring-danger/45',
  ghost: 'border-transparent bg-transparent text-muted hover:bg-surface-raised hover:text-text',
  primary:
    'border-accent/70 bg-accent text-background hover:bg-accent/90 focus-visible:ring-accent/45',
  secondary:
    'border-border bg-surface-raised text-text hover:border-accent/35 hover:bg-surface-raised/80',
};

const sizes: Record<ButtonSize, string> = {
  lg: 'h-12 px-5 text-base',
  md: 'h-10 px-4 text-sm',
  sm: 'h-8 px-3 text-sm',
};

const LoadingMark = () => (
  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
);

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      disabled,
      isLoading = false,
      size = 'md',
      type = 'button',
      variant = 'primary',
      ...props
    },
    ref,
  ) => {
    const content: ReactNode = isLoading ? (
      <>
        <LoadingMark />
        <span>{children}</span>
      </>
    ) : (
      children
    );

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-md border font-medium tracking-normal transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
          sizes[size],
          variants[variant],
          className,
        )}
        disabled={disabled || isLoading}
        type={type}
        {...props}
      >
        {content}
      </button>
    );
  },
);

Button.displayName = 'Button';
