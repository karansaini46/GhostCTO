import { forwardRef, useId } from 'react';
import type { ReactNode, TextareaHTMLAttributes } from 'react';

import { cn } from '../../lib/cn';

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: string;
  hint?: string;
  label?: ReactNode;
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
          <label className="block text-sm font-semibold text-text" htmlFor={textareaId}>
            {label}
          </label>
        ) : null}
        <textarea
          ref={ref}
          aria-describedby={description ? helpTextId : undefined}
          aria-invalid={error ? true : undefined}
          className={cn(
            'min-h-32 w-full resize-y rounded-md border bg-surface-card px-3.5 py-3 text-sm leading-6 text-text shadow-sm transition-all duration-200 ease-soft',
            'placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus/20',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error ? 'border-danger focus:border-danger focus:ring-danger/20' : 'border-border',
            className,
          )}
          id={textareaId}
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

Textarea.displayName = 'Textarea';
