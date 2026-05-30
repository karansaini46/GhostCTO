import type { ReactNode } from 'react';
import { HelpCircle, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './Card';
import type { Project } from '../../features/projects/project-types';
import { getProjectOptionLabel } from '../../features/projects/project-options';

// 1. ModulePageShell
export type ModulePageShellProps = {
  children: ReactNode;
  className?: string;
};

export const ModulePageShell = ({ children, className }: ModulePageShellProps) => (
  <div className={cn("grid grid-cols-12 gap-6 xl:gap-8 max-w-[1320px] mx-auto", className)}>
    {children}
  </div>
);

// 2. ModuleInputPanel
export type ModuleInputPanelProps = {
  children: ReactNode;
  className?: string;
  colSpan?: string;
};

export const ModuleInputPanel = ({ children, className, colSpan = "col-span-12 xl:col-span-5" }: ModuleInputPanelProps) => (
  <aside className={cn("space-y-6", colSpan, className)}>
    {children}
  </aside>
);

// 3. ModuleOutputPanel
export type ModuleOutputPanelProps = {
  children: ReactNode;
  className?: string;
  colSpan?: string;
};

export const ModuleOutputPanel = ({ children, className, colSpan = "col-span-12 xl:col-span-7" }: ModuleOutputPanelProps) => (
  <section className={cn("space-y-6 min-w-0", colSpan, className)}>
    {children}
  </section>
);

// 4. HelpfulEmptyState
export type HelpfulEmptyStateProps = {
  title: string;
  description: string;
  icon?: ReactNode;
  whatItDoes: string;
  whatToProvide: string[];
  whatYouGet: string[];
  previewTitle?: string;
  previewSections?: Array<{ title: string; desc: string }>;
  action?: ReactNode;
};

export const HelpfulEmptyState = ({
  title,
  description,
  icon,
  whatItDoes,
  whatToProvide,
  whatYouGet,
  previewTitle = "Expected advisor outputs:",
  previewSections,
  action,
}: HelpfulEmptyStateProps) => (
  <Card className="border-subtle bg-surface-card shadow-soft backdrop-blur-sm">
    <CardHeader>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-accent/20 bg-accent-soft text-accent">
          {icon ?? <HelpCircle className="h-5 w-5" />}
        </div>
        <div>
          <CardTitle className="text-lg font-bold">{title}</CardTitle>
          <CardDescription className="text-sm">{description}</CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-[0.1em] text-muted">What it does</h4>
          <p className="text-sm leading-relaxed text-secondary">{whatItDoes}</p>
        </div>
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-[0.1em] text-muted">What you supply</h4>
          <ul className="list-disc pl-4 text-sm space-y-1 text-secondary">
            {whatToProvide.map((item, idx) => <li key={idx}>{item}</li>)}
          </ul>
        </div>
      </div>

      <div className="border-t border-subtle pt-5 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-[0.1em] text-muted">{previewTitle}</h4>
        {previewSections ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {previewSections.map((sec, idx) => (
              <div key={idx} className="rounded-lg border border-subtle/80 bg-surface-raised/40 p-3">
                <p className="text-sm font-semibold text-text">{sec.title}</p>
                <p className="mt-1 text-xs text-muted leading-relaxed">{sec.desc}</p>
              </div>
            ))}
          </div>
        ) : (
          <ul className="list-disc pl-4 text-sm space-y-1 text-secondary">
            {whatYouGet.map((item, idx) => <li key={idx}>{item}</li>)}
          </ul>
        )}
      </div>
      {action ? <div className="border-t border-subtle pt-4">{action}</div> : null}
    </CardContent>
  </Card>
);

// 5. ProjectContextCard
export type ProjectContextCardProps = {
  project: Project;
};

export const ProjectContextCard = ({ project }: ProjectContextCardProps) => (
  <Card className="border-subtle bg-surface-card shadow-soft">
    <CardHeader className="pb-3">
      <CardTitle className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Active Project Context</CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      <div>
        <p className="text-xs font-semibold text-muted">Industry & Type</p>
        <p className="text-sm text-text font-medium">{project.industry || "Not specified"} • {project.productType || "Not specified"}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 border-t border-subtle pt-3">
        <div>
          <p className="text-xs font-semibold text-muted">Budget</p>
          <p className="text-xs text-text font-medium">{getProjectOptionLabel.budgetRange(project.budgetRange)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted">Timeline</p>
          <p className="text-xs text-text font-medium">{getProjectOptionLabel.launchTimeline(project.launchTimeline)}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 border-t border-subtle pt-3">
        <div>
          <p className="text-xs font-semibold text-muted">CTO Level</p>
          <p className="text-xs text-text font-medium">{getProjectOptionLabel.founderTechnicalLevel(project.founderTechnicalLevel)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted">Stage</p>
          <p className="text-xs text-text font-medium">{getProjectOptionLabel.currentStage(project.currentStage)}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

// 6. MetricCard
export type MetricCardProps = {
  title: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
  variant?: 'default' | 'accent' | 'success' | 'warning' | 'danger';
};

export const MetricCard = ({ title, value, description, icon, variant = 'default' }: MetricCardProps) => {
  const borderColors = {
    default: 'border-subtle bg-surface-card',
    accent: 'border-accent/25 bg-accent-soft/20 text-accent-soft',
    success: 'border-success-subtle bg-success-soft',
    warning: 'border-warning-subtle bg-warning-soft',
    danger: 'border-danger-subtle bg-danger-soft',
  };

  return (
    <Card className={cn("border shadow-soft", borderColors[variant])}>
      <CardContent className="flex items-center gap-4 p-5">
        {icon ? (
          <div className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border",
            variant === 'default' ? 'border-subtle bg-surface-raised text-secondary' : 'border-current/10 bg-current/5'
          )}>
            {icon}
          </div>
        ) : null}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted">{title}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-text leading-none">{value}</p>
          {description ? (
            <p className="mt-1 text-xs text-secondary leading-relaxed">{description}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
};

// 7. RiskCard
export type RiskCardProps = {
  risk: string;
  impact: string;
  mitigation: string;
  level?: 'low' | 'medium' | 'high';
};

export const RiskCard = ({ risk, impact, mitigation, level = 'medium' }: RiskCardProps) => {
  const levelStyles = {
    low: {
      border: 'border-success-subtle bg-success-soft/30',
      text: 'text-success',
      icon: <CheckCircle2 className="h-5 w-5" />
    },
    medium: {
      border: 'border-warning-subtle bg-warning-soft/30',
      text: 'text-warning',
      icon: <AlertCircle className="h-5 w-5" />
    },
    high: {
      border: 'border-danger-subtle bg-danger-soft/30',
      text: 'text-danger',
      icon: <AlertTriangle className="h-5 w-5" />
    }
  };

  const style = levelStyles[level];

  return (
    <div className={cn("rounded-panel border p-5 space-y-3", style.border)}>
      <div className="flex items-start gap-3">
        <div className={style.text}>{style.icon}</div>
        <div className="space-y-1">
          <p className="text-sm font-bold text-text">{risk}</p>
          <p className="text-xs text-secondary leading-relaxed"><span className="font-semibold text-text">Impact:</span> {impact}</p>
        </div>
      </div>
      <div className="border-t border-subtle/50 pt-2 text-xs text-secondary leading-relaxed">
        <span className="font-semibold text-text">Mitigation:</span> {mitigation}
      </div>
    </div>
  );
};

// 8. ResultSection
export type ResultSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export const ResultSection = ({ title, description, children, className }: ResultSectionProps) => (
  <Card className={cn("border-subtle bg-surface-card shadow-soft", className)}>
    <CardHeader className="pb-3 border-b border-subtle">
      <CardTitle className="text-sm font-bold text-text uppercase tracking-wider">{title}</CardTitle>
      {description ? <CardDescription className="text-xs leading-relaxed">{description}</CardDescription> : null}
    </CardHeader>
    <CardContent className="pt-5">
      {children}
    </CardContent>
  </Card>
);

// 9. FormSection
export type FormSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export const FormSection = ({ title, description, children, className }: FormSectionProps) => (
  <div className={cn("space-y-4 border-b border-subtle/70 pb-6 last:border-0 last:pb-0", className)}>
    <div>
      <h3 className="text-sm font-bold text-text uppercase tracking-wider">{title}</h3>
      {description ? <p className="text-xs text-muted mt-1 leading-relaxed">{description}</p> : null}
    </div>
    <div className="space-y-4 pt-1">
      {children}
    </div>
  </div>
);
