import type { ReactNode } from 'react';

export type TooltipProps = {
  children: ReactNode;
  label: string;
};

export const Tooltip = ({ children, label }: TooltipProps) => (
  <span className="group relative inline-flex">
    {children}
    <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-max max-w-56 -translate-x-1/2 rounded-md border border-subtle bg-text px-2.5 py-1.5 text-xs font-medium leading-4 text-surface-card shadow-soft group-hover:block group-focus-within:block">
      {label}
    </span>
  </span>
);
