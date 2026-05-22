import { cn } from '../../lib/cn';

export type LoadingStateProps = {
  className?: string;
  label?: string;
};

export const LoadingState = ({ className, label = 'Loading' }: LoadingStateProps) => (
  <div
    className={cn(
      'flex min-h-40 items-center justify-center rounded-lg border border-border bg-surface px-6 py-8',
      className,
    )}
  >
    <div className="flex items-center gap-3 text-sm font-medium text-muted">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-accent" />
      <span>{label}</span>
    </div>
  </div>
);
