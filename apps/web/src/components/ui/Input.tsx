import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes } from 'react';

import { cn } from '../../lib/cn';

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: string;
  hint?: string;
  label?: string;
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
          <label className="block text-sm font-medium text-text" htmlFor={inputId}>
            {label}
          </label>
        ) : null}
        <input
          ref={ref}
          aria-describedby={description ? helpTextId : undefined}
          aria-invalid={error ? true : undefined}
          className={cn(
            'h-10 w-full rounded-md border bg-surface px-3 text-sm text-text shadow-sm transition-colors',
            'placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error ? 'border-danger focus:border-danger focus:ring-danger/20' : 'border-border',
            className,
          )}
          id={inputId}
          {...props}
        />
        {description ? (
          <p className={cn('text-sm', error ? 'text-danger' : 'text-muted')} id={helpTextId}>
            {description}
          </p>
        ) : null}
      </div>
    );
  },
);

Input.displayName = 'Input';
