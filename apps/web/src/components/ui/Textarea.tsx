import { forwardRef, useId } from 'react';
import type { TextareaHTMLAttributes } from 'react';

import { cn } from '../../lib/cn';

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: string;
  hint?: string;
  label?: string;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, hint, id, label, ...props }, ref) => {
    const generatedId = useId();
    const textareaId = id ?? generatedId;
    const helpTextId = `${textareaId}-help`;
    const description = error ?? hint;

    return (
      <div className="space-y-2">
        {label ? (
          <label className="block text-sm font-medium text-text" htmlFor={textareaId}>
            {label}
          </label>
        ) : null}
        <textarea
          ref={ref}
          aria-describedby={description ? helpTextId : undefined}
          aria-invalid={error ? true : undefined}
          className={cn(
            'min-h-28 w-full resize-y rounded-md border bg-surface px-3 py-2 text-sm leading-6 text-text shadow-sm transition-colors',
            'placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error ? 'border-danger focus:border-danger focus:ring-danger/20' : 'border-border',
            className,
          )}
          id={textareaId}
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

Textarea.displayName = 'Textarea';
