import { cn } from '../../lib/cn';

export type LoadingStateProps = {
  className?: string;
  label?: string;
};

export const LoadingState = ({ className, label = 'Loading' }: LoadingStateProps) => (
  <div
    className={cn(
      'flex min-h-40 items-center justify-center rounded-panel border border-subtle bg-surface-card px-6 py-8 shadow-soft',
      className,
    )}
  >
    <div className="flex flex-col items-center gap-4 text-center text-sm font-semibold text-secondary">
      <span className="relative h-10 w-10 rounded-full border border-accent/20 bg-accent-soft">
        <span className="absolute inset-2 animate-spin rounded-full border-2 border-accent/20 border-t-accent" />
      </span>
      <span>{label}</span>
    </div>
  </div>
);
