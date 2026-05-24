import { Link } from 'react-router-dom';

type GenerationLimitCalloutProps = {
  message: string;
};

export const GenerationLimitCallout = ({ message }: GenerationLimitCalloutProps) => (
  <div className="rounded-md border border-warning/35 bg-warning/5 p-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-warning">Generation limit reached</p>
        <p className="mt-1 text-sm leading-6 text-muted">{message}</p>
      </div>
      <Link
        className="inline-flex h-10 shrink-0 items-center justify-center rounded-md border border-border bg-surface-raised px-4 text-sm font-medium tracking-normal text-text transition-colors hover:border-accent/35 hover:bg-surface-raised/80"
        to="/billing"
      >
        Review access
      </Link>
    </div>
  </div>
);
