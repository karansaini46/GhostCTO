import { forwardRef, useId } from 'react';
import type { SelectHTMLAttributes } from 'react';

import { cn } from '../../lib/cn';

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  error?: string;
  hint?: string;
  label?: string;
  placeholder?: string;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ children, className, error, hint, id, label, placeholder, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id ?? generatedId;
    const helpTextId = `${selectId}-help`;
    const description = error ?? hint;

    return (
      <div className="space-y-2">
        {label ? (
          <label className="block text-sm font-medium text-text" htmlFor={selectId}>
            {label}
          </label>
        ) : null}
        <select
          ref={ref}
          aria-describedby={description ? helpTextId : undefined}
          aria-invalid={error ? true : undefined}
          className={cn(
            'h-10 w-full rounded-md border bg-surface px-3 text-sm text-text shadow-sm transition-colors',
            'focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 disabled:cursor-not-allowed disabled:opacity-50',
            error ? 'border-danger focus:border-danger focus:ring-danger/20' : 'border-border',
            className,
          )}
          id={selectId}
          {...props}
        >
          {placeholder ? (
            <option disabled value="">
              {placeholder}
            </option>
          ) : null}
          {children}
        </select>
        {description ? (
          <p className={cn('text-sm', error ? 'text-danger' : 'text-muted')} id={helpTextId}>
            {description}
          </p>
        ) : null}
      </div>
    );
  },
);

Select.displayName = 'Select';
