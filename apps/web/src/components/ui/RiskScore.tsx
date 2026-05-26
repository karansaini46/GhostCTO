import { cn } from '../../lib/cn';

export type RiskScoreProps = {
  className?: string;
  label?: string;
  max?: number;
  score: number;
};

const getTone = (percent: number) => {
  if (percent >= 70) {
    return 'bg-danger';
  }

  if (percent >= 40) {
    return 'bg-warning';
  }

  return 'bg-success';
};

export const RiskScore = ({
  className,
  label = 'Risk score',
  max = 100,
  score,
}: RiskScoreProps) => {
  const percent = Math.max(0, Math.min(100, Math.round((score / max) * 100)));

  return (
    <div className={cn('rounded-panel border border-subtle bg-surface-card p-4', className)}>
      <div className="flex items-end justify-between gap-4">
        <p className="text-sm font-semibold text-text">{label}</p>
        <p className="font-editorial text-3xl font-semibold text-text">
          {score}
          <span className="text-base text-muted">/{max}</span>
        </p>
      </div>
      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-surface-soft">
        <div
          className={cn('h-full rounded-full', getTone(percent))}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};
