import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

import { cn } from '../../lib/cn';

export type AccordionItem = {
  content: ReactNode;
  title: string;
};

export type AccordionProps = {
  className?: string;
  items: AccordionItem[];
};

export const Accordion = ({ className, items }: AccordionProps) => (
  <div
    className={cn(
      'divide-y divide-subtle rounded-panel border border-subtle bg-surface-card',
      className,
    )}
  >
    {items.map((item) => (
      <details className="group" key={item.title}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-sm font-semibold text-text">
          {item.title}
          <ChevronDown className="h-4 w-4 text-muted transition-transform duration-200 group-open:rotate-180" />
        </summary>
        <div className="px-4 pb-4 text-sm leading-6 text-secondary">{item.content}</div>
      </details>
    ))}
  </div>
);
