import { Link } from 'react-router-dom';

type GenerationLimitCalloutProps = {
  message: string;
};

export const GenerationLimitCallout = ({ message }: GenerationLimitCalloutProps) => (
  <div className="rounded-panel border border-warning/25 bg-warning/10 p-4 shadow-sm">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-text">Daily document limit reached</p>
        <p className="mt-1 text-sm leading-6 text-secondary">{message}</p>
      </div>
      <Link
        className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-md border border-border bg-surface-card px-4 text-sm font-semibold tracking-normal text-text shadow-sm transition-all duration-200 ease-soft hover:border-accent/35 hover:bg-surface-raised"
        to="/billing"
      >
        Review access
      </Link>
    </div>
  </div>
);
