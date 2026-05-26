import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '../../lib/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

const variants: Record<ButtonVariant, string> = {
  danger:
    'border-danger/30 bg-danger/10 text-danger hover:bg-danger/15 focus-visible:ring-danger/35',
  ghost: 'border-transparent bg-transparent text-muted hover:bg-surface-soft hover:text-text',
  primary:
    'border-accent bg-accent text-surface-card shadow-soft hover:bg-accent/90 focus-visible:ring-focus/35',
  secondary:
    'border-border bg-surface-card text-text shadow-sm hover:border-accent/35 hover:bg-surface-raised focus-visible:ring-focus/30',
};

const sizes: Record<ButtonSize, string> = {
  lg: 'min-h-12 px-5 text-base',
  md: 'min-h-10 px-4 text-sm',
  sm: 'min-h-8 px-3 text-sm',
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
      leftIcon,
      rightIcon,
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
      <>
        {leftIcon ? <span className="shrink-0">{leftIcon}</span> : null}
        <span>{children}</span>
        {rightIcon ? <span className="shrink-0">{rightIcon}</span> : null}
      </>
    );

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-md border font-semibold tracking-normal transition-all duration-200 ease-soft',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
          '[&_svg]:h-4 [&_svg]:w-4',
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
