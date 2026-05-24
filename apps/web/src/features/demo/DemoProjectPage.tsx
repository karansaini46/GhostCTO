import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';

import { Badge } from '../../components/ui';
import { useAuth } from '../auth/auth-context';
import { getProjectOptionLabel } from '../projects/project-options';
import { DemoOutputPanel } from './DemoOutputPanel';
import { isDemoModeEnabled } from './demo-mode';
import {
  demoOutputOrder,
  demoOutputs,
  demoProject,
  demoSampleNotice,
  type DemoOutputKey,
} from './demo-sample-data';

const outputLabels: Record<DemoOutputKey, string> = {
  codeAudit: 'Code audit',
  quoteAnalysis: 'Quote analysis',
  roadmap: 'Roadmap',
  stackAdvice: 'Stack advice',
  technicalSpec: 'Spec',
};

const linkClass =
  'inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium tracking-normal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45';

const primaryLinkClass = `${linkClass} border-accent/70 bg-accent text-background hover:bg-accent/90`;
const secondaryLinkClass = `${linkClass} border-border bg-surface-raised text-text hover:border-accent/35 hover:bg-surface-raised/80`;

export const DemoProjectPage = () => {
  const { status } = useAuth();
  const [activeOutputKey, setActiveOutputKey] = useState<DemoOutputKey>('roadmap');
  const activeOutput = demoOutputs[activeOutputKey];
  const isAuthenticated = status === 'authenticated';

  if (!isDemoModeEnabled) {
    return <Navigate replace to="/" />;
  }

  return (
    <div className="min-h-screen bg-background text-text">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link className="flex items-center gap-3" to="/">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-accent/35 bg-accent/10 text-sm font-semibold text-accent">
              GC
            </div>
            <div>
              <p className="text-sm font-semibold tracking-normal text-text">GhostCTO</p>
              <p className="text-xs text-muted">Demo project</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link className={secondaryLinkClass} to="/">
              Landing
            </Link>
            {isAuthenticated ? (
              <Link className={primaryLinkClass} to="/dashboard">
                Open workspace
              </Link>
            ) : (
              <Link className={primaryLinkClass} to="/register">
                Create account
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-lg border border-warning/35 bg-warning/5 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Badge variant="warning">Demo mode</Badge>
              <h1 className="mt-4 text-3xl font-semibold tracking-normal text-text">
                {demoProject.name}
              </h1>
              <p className="mt-3 max-w-4xl text-sm leading-6 text-muted">
                {demoSampleNotice} Nothing in this sample project is connected to real workspace
                records, billing, generated documents, or customer data.
              </p>
            </div>
            <Badge variant="accent">Read-only</Badge>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1fr_0.85fr]">
          <div className="rounded-lg border border-border bg-surface p-5 shadow-panel">
            <Badge>Project context</Badge>
            <h2 className="mt-4 text-xl font-semibold tracking-normal text-text">
              {demoProject.name}
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted">{demoProject.ideaSummary}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {demoProject.mustHaveFeatures.map((feature) => (
                <div className="rounded-md border border-border bg-surface-raised p-4" key={feature}>
                  <p className="text-sm leading-6 text-text">{feature}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface p-5 shadow-panel">
            <Badge>Constraints</Badge>
            <div className="mt-4 grid gap-3">
              {[
                ['Stage', getProjectOptionLabel.currentStage(demoProject.currentStage)],
                ['Budget', getProjectOptionLabel.budgetRange(demoProject.budgetRange)],
                ['Timeline', getProjectOptionLabel.launchTimeline(demoProject.launchTimeline)],
                [
                  'Technical level',
                  getProjectOptionLabel.founderTechnicalLevel(demoProject.founderTechnicalLevel),
                ],
                ['Product type', getProjectOptionLabel.productType(demoProject.productType)],
                ['Monetization', getProjectOptionLabel.monetization(demoProject.monetization)],
              ].map(([label, value]) => (
                <div
                  className="flex items-start justify-between gap-4 rounded-md border border-border bg-surface-raised p-3"
                  key={label}
                >
                  <p className="text-xs uppercase tracking-normal text-muted">{label}</p>
                  <p className="text-right text-sm font-medium leading-5 text-text">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Badge variant="accent">Generated outputs</Badge>
              <h2 className="mt-4 text-2xl font-semibold tracking-normal text-text">
                Static sample artifacts
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
                These outputs are bundled demo assets and never mixed into project APIs or saved
                user documents.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {demoOutputOrder.map((key) => (
                <button
                  className={`h-10 rounded-md border px-3 text-sm font-medium tracking-normal transition-colors ${
                    activeOutputKey === key
                      ? 'border-accent/70 bg-accent text-background'
                      : 'border-border bg-surface-raised text-muted hover:border-accent/35 hover:text-text'
                  }`}
                  key={key}
                  onClick={() => setActiveOutputKey(key)}
                  type="button"
                >
                  {outputLabels[key]}
                </button>
              ))}
            </div>
          </div>

          <DemoOutputPanel output={activeOutput} showMarkdown />
        </section>
      </main>
    </div>
  );
};
