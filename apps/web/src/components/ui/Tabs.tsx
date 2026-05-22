import { useId } from 'react';
import type { ReactNode } from 'react';

import { cn } from '../../lib/cn';

export type TabItem = {
  content: ReactNode;
  disabled?: boolean;
  label: string;
  value: string;
};

export type TabsProps = {
  className?: string;
  items: TabItem[];
  onValueChange: (value: string) => void;
  value: string;
};

export const Tabs = ({ className, items, onValueChange, value }: TabsProps) => {
  const generatedId = useId();
  const activeItem = items.find((item) => item.value === value) ?? items[0];

  return (
    <div className={cn('space-y-4', className)}>
      <div
        className="inline-flex rounded-lg border border-border bg-surface-raised p-1"
        role="tablist"
      >
        {items.map((item) => {
          const active = item.value === activeItem.value;

          return (
            <button
              aria-controls={`${generatedId}-${item.value}-panel`}
              aria-selected={active}
              className={cn(
                'h-9 rounded-md px-3 text-sm font-medium tracking-normal transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35',
                active ? 'bg-accent text-background' : 'text-muted hover:text-text',
                item.disabled ? 'cursor-not-allowed opacity-50' : '',
              )}
              disabled={item.disabled}
              id={`${generatedId}-${item.value}-tab`}
              key={item.value}
              onClick={() => onValueChange(item.value)}
              role="tab"
              type="button"
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <div
        aria-labelledby={`${generatedId}-${activeItem.value}-tab`}
        className="rounded-lg border border-border bg-surface p-4 text-sm leading-6 text-muted"
        id={`${generatedId}-${activeItem.value}-panel`}
        role="tabpanel"
      >
        {activeItem.content}
      </div>
    </div>
  );
};
