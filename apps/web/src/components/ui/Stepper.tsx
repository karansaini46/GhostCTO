import { Check } from 'lucide-react';

import { cn } from '../../lib/cn';

export type StepperItem = {
  description?: string;
  title: string;
};

export type StepperProps = {
  activeIndex: number;
  className?: string;
  items: StepperItem[];
};

export const Stepper = ({ activeIndex, className, items }: StepperProps) => (
  <ol className={cn('space-y-2', className)}>
    {items.map((item, index) => {
      const isActive = index === activeIndex;
      const isComplete = index < activeIndex;

      return (
        <li
          className={cn(
            'rounded-panel border p-3 transition-all duration-200 ease-soft',
            isActive
              ? 'border-accent bg-accent-soft shadow-sm'
              : isComplete
                ? 'border-success/25 bg-success/10'
                : 'border-subtle bg-surface-card',
          )}
          key={item.title}
        >
          <div className="flex items-start gap-3">
            <span
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                isComplete
                  ? 'border-success bg-success text-surface-card'
                  : isActive
                    ? 'border-accent bg-accent text-surface-card'
                    : 'border-border bg-surface-raised text-muted',
              )}
            >
              {isComplete ? <Check className="h-3.5 w-3.5" /> : index + 1}
            </span>
            <span>
              <span className="block text-sm font-semibold text-text">{item.title}</span>
              {item.description ? (
                <span className="mt-1 block text-xs leading-5 text-secondary">{item.description}</span>
              ) : null}
            </span>
          </div>
        </li>
      );
    })}
  </ol>
);
