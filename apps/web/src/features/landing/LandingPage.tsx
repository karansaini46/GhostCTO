import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Badge } from '../../components/ui';
import { useAuth } from '../auth/auth-context';
import { DemoOutputPanel } from '../demo/DemoOutputPanel';
import { isDemoModeEnabled } from '../demo/demo-mode';
import {
  demoOutputOrder,
  demoOutputs,
  demoProjectName,
  demoProjectSummary,
  demoSampleNotice,
  type DemoOutputKey,
} from '../demo/demo-sample-data';

const outputLabels: Record<DemoOutputKey, string> = {
  codeAudit: 'Code audit',
  quoteAnalysis: 'Quote analysis',
  roadmap: 'Roadmap',
  stackAdvice: 'Stack advice',
  technicalSpec: 'Spec',
};

const linkClass =
  'inline-flex h-11 items-center justify-center rounded-md border px-4 text-sm font-medium tracking-normal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45';

const primaryLinkClass = `${linkClass} border-accent/70 bg-accent text-background hover:bg-accent/90`;
const secondaryLinkClass = `${linkClass} border-border bg-surface-raised text-text hover:border-accent/35 hover:bg-surface-raised/80`;

const HeroPreview = () => (
  <div className="pointer-events-none absolute inset-x-0 top-16 mx-auto hidden max-w-6xl grid-cols-3 gap-4 px-6 opacity-30 lg:grid">
    {demoOutputOrder.slice(0, 3).map((key) => {
      const output = demoOutputs[key];

      return (
        <div
          className="min-h-[21rem] rounded-lg border border-border bg-surface p-4 shadow-panel"
          key={key}
        >
          <div className="flex items-center justify-between gap-3">
            <Badge variant="accent">{output.artifactType}</Badge>
            <Badge>{output.metrics[0].value}</Badge>
          </div>
          <p className="mt-5 text-sm font-semibold leading-6 text-text">{output.verdict}</p>
          <div className="mt-5 space-y-3">
            {output.sections[0].items.map((item) => (
              <div className="rounded-md border border-border bg-surface-raised p-3" key={item}>
                <p className="line-clamp-2 text-xs leading-5 text-muted">{item}</p>
              </div>
            ))}
          </div>
        </div>
      );
    })}
  </div>
);

export const LandingPage = () => {
  const { status } = useAuth();
  const [activeOutputKey, setActiveOutputKey] = useState<DemoOutputKey>('roadmap');
  const activeOutput = demoOutputs[activeOutputKey];
  const isAuthenticated = status === 'authenticated';

  return (
    <div className="min-h-screen bg-background text-text">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link className="flex items-center gap-3" to="/">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-accent/35 bg-accent/10 text-sm font-semibold text-accent">
              GC
            </div>
            <div>
              <p className="text-sm font-semibold tracking-normal text-text">GhostCTO</p>
              <p className="text-xs text-muted">Founder workspace</p>
            </div>
          </Link>
          <nav className="flex items-center gap-2">
            {isDemoModeEnabled ? (
              <Link className={secondaryLinkClass} to="/demo">
                Demo
              </Link>
            ) : null}
            {isAuthenticated ? (
              <Link className={primaryLinkClass} to="/dashboard">
                Open workspace
              </Link>
            ) : (
              <>
                <Link className={secondaryLinkClass} to="/login">
                  Sign in
                </Link>
                <Link className={primaryLinkClass} to="/register">
                  Create account
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        <section className="relative min-h-[34rem] overflow-hidden border-b border-border">
          <HeroPreview />
          <div className="absolute inset-0 bg-background/80" />
          <div className="relative mx-auto flex min-h-[34rem] max-w-5xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6 lg:px-8">
            <Badge variant="accent">Fictional demo project</Badge>
            <h1 className="mt-5 text-4xl font-semibold tracking-normal text-text sm:text-5xl">
              GhostCTO
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-muted sm:text-lg">
              Turn founder notes into practical technical plans, vendor questions, and build
              artifacts that make execution easier to review.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {isAuthenticated ? (
                <Link className={primaryLinkClass} to="/dashboard">
                  Open workspace
                </Link>
              ) : (
                <Link className={primaryLinkClass} to="/register">
                  Start workspace
                </Link>
              )}
              {isDemoModeEnabled ? (
                <Link className={secondaryLinkClass} to="/demo">
                  View demo project
                </Link>
              ) : (
                <Link className={secondaryLinkClass} to="#sample-output">
                  View sample output
                </Link>
              )}
            </div>
          </div>
        </section>

        <section className="border-b border-border bg-surface/50">
          <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
            <div>
              <Badge>Sample project</Badge>
              <h2 className="mt-4 text-2xl font-semibold tracking-normal text-text">
                {demoProjectName}
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted">{demoProjectSummary}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ['Stage', 'Prototype'],
                ['Budget', '$15k to $50k'],
                ['Timeline', '8 to 12 weeks'],
                ['Customer', 'Independent local coaches'],
              ].map(([label, value]) => (
                <div className="rounded-md border border-border bg-surface p-4" key={label}>
                  <p className="text-xs uppercase tracking-normal text-muted">{label}</p>
                  <p className="mt-2 text-sm font-medium leading-5 text-text">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8" id="sample-output">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Badge variant="warning">Static sample data</Badge>
              <h2 className="mt-4 text-2xl font-semibold tracking-normal text-text">
                Real-looking generated outputs
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
                {demoSampleNotice}
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

          <div className="mt-6">
            <DemoOutputPanel output={activeOutput} />
          </div>
        </section>
      </main>
    </div>
  );
};
