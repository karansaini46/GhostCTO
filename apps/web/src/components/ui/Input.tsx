import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';

import { cn } from '../../lib/cn';

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: string;
  hint?: string;
  label?: ReactNode;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, hint, id, label, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const helpTextId = `${inputId}-help`;
    const description = error ?? hint;

    return (
      <div className="space-y-2">
        {label ? (
          <label className="block text-sm font-semibold text-text" htmlFor={inputId}>
            {label}
          </label>
        ) : null}
        <input
          ref={ref}
          aria-describedby={description ? helpTextId : undefined}
          aria-invalid={error ? true : undefined}
          className={cn(
            'min-h-11 w-full rounded-md border bg-surface-card px-3.5 text-sm text-text shadow-sm transition-all duration-200 ease-soft',
            'placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus/20',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error ? 'border-danger focus:border-danger focus:ring-danger/20' : 'border-border',
            className,
          )}
          id={inputId}
          {...props}
        />
        {description ? (
          <p
            className={cn('text-sm leading-5', error ? 'text-danger' : 'text-muted')}
            id={helpTextId}
          >
            {description}
          </p>
        ) : null}
      </div>
    );
  },
);

Input.displayName = 'Input';
