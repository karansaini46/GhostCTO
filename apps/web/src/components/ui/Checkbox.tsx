import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes } from 'react';

import { cn } from '../../lib/cn';

export type CheckboxProps = InputHTMLAttributes<HTMLInputElement> & {
  description?: string;
  label: string;
};

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, description, id, label, ...props }, ref) => {
    const generatedId = useId();
    const checkboxId = id ?? generatedId;

    return (
      <label
        className={cn(
          'flex cursor-pointer items-start gap-3 rounded-md border border-subtle bg-surface-card p-3 transition-all duration-200 ease-soft hover:border-accent/35 hover:bg-surface-raised',
          className,
        )}
        htmlFor={checkboxId}
      >
        <input
          ref={ref}
          className="mt-1 h-4 w-4 rounded border-border accent-accent"
          id={checkboxId}
          type="checkbox"
          {...props}
        />
        <span>
          <span className="block text-sm font-semibold text-text">{label}</span>
          {description ? <span className="mt-1 block text-sm leading-5 text-secondary">{description}</span> : null}
        </span>
      </label>
    );
  },
);

Checkbox.displayName = 'Checkbox';
