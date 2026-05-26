import type { InputHTMLAttributes, ReactNode } from 'react';

import { cn } from '../../lib/cn';

export type ChoiceCardProps = InputHTMLAttributes<HTMLInputElement> & {
  description?: string;
  icon?: ReactNode;
  label: string;
};

export const ChoiceCard = ({
  checked,
  className,
  description,
  icon,
  label,
  type = 'radio',
  ...props
}: ChoiceCardProps) => (
  <label
    className={cn(
      'flex cursor-pointer gap-3 rounded-panel border bg-surface-card p-4 text-left shadow-sm transition-all duration-200 ease-soft',
      checked
        ? 'border-accent bg-accent-soft text-text shadow-soft'
        : 'border-subtle text-secondary hover:border-accent/35 hover:bg-surface-raised',
      className,
    )}
  >
    <input checked={checked} className="mt-1 h-4 w-4 accent-accent" type={type} {...props} />
    {icon ? <span className="mt-0.5 text-accent [&_svg]:h-5 [&_svg]:w-5">{icon}</span> : null}
    <span className="min-w-0">
      <span className="block text-sm font-semibold text-text">{label}</span>
      {description ? <span className="mt-1 block text-sm leading-6 text-secondary">{description}</span> : null}
    </span>
  </label>
);
