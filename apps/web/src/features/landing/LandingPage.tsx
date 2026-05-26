import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileText,
  MessageCircle,
  ShieldCheck,
} from 'lucide-react';

import { useAuth } from '../auth/auth-context';

const painPoints = [
  {
    description:
      'Vendors ask for technical decisions before you know what those decisions mean for cost, scope, and risk.',
    title: 'Unclear scope becomes expensive',
  },
  {
    description:
      'Every proposal sounds confident until you try to compare deliverables, ownership, timelines, and missing assumptions.',
    title: 'Quotes are hard to challenge',
  },
  {
    description:
      'Without a clear brief, interviews become guesswork and the wrong hire can shape the product before customers do.',
    title: 'Hiring signals stay noisy',
  },
];

const outputs = [
  'Technical roadmap',
  'Stack recommendation',
  'Developer-ready spec',
  'Quote risk review',
  'Hiring brief',
  'Code and vendor audit',
];

const workflow = [
  {
    description: 'Answer a guided intake about your customer, budget, timeline, and first launch.',
    title: 'Describe the business clearly',
  },
  {
    description: 'Get practical planning documents written for founders and useful to developers.',
    title: 'Receive the technical picture',
  },
  {
    description: 'Use the output to brief developers, compare quotes, and ask sharper questions.',
    title: 'Walk into hiring prepared',
  },
];

const useCases = [
  'Preparing to hire a freelancer or agency',
  'Validating what belongs in the first build',
  'Checking whether a quote is fair',
  'Turning a feature idea into a clear spec',
  'Reviewing risk in code or a repository',
  'Building confidence before a vendor call',
];

const faqs = [
  {
    answer:
      'No. It gives you founder-friendly technical context before you spend money, but complex products still benefit from experienced technical leadership.',
    question: 'Does GhostCTO replace a CTO?',
  },
  {
    answer:
      'No. The product is written for founders who need plain-English technical decisions, not a software engineering course.',
    question: 'Do I need technical experience?',
  },
  {
    answer:
      'It helps you identify pricing, scope, and timeline risk. Custom builds still need vendor confirmation before you commit.',
    question: 'Can it tell me the exact cost?',
  },
  {
    answer:
      'Yes. You can review quotes, audit technical work, prepare hiring questions, and keep project documents together after work begins.',
    question: 'Can I use it after hiring starts?',
  },
];

const linkBase =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-md border px-5 text-sm font-semibold transition-all duration-200 ease-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background';
const primaryLink = `${linkBase} border-accent bg-accent text-surface-card shadow-soft hover:bg-accent/90`;
const secondaryLink = `${linkBase} border-border bg-surface-card text-text shadow-sm hover:border-accent/35 hover:bg-surface-raised`;

const ProductPreview = () => (
  <div className="rounded-[1.35rem] border border-subtle bg-surface-card p-3 shadow-panel">
    <div className="overflow-hidden rounded-[1rem] border border-subtle bg-surface">
      <div className="flex items-center justify-between border-b border-subtle bg-surface-card px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-accent/25 bg-accent-soft font-editorial text-base font-semibold text-accent">
            G
          </div>
          <div>
            <p className="text-sm font-semibold text-text">Founder workspace</p>
            <p className="text-xs text-muted">Vendor trust platform</p>
          </div>
        </div>
        <span className="rounded-full border border-success/25 bg-success/10 px-3 py-1 text-xs font-semibold text-success">
          Ready to brief
        </span>
      </div>
      <div className="grid lg:grid-cols-[14rem_1fr]">
        <aside className="border-b border-subtle bg-surface-raised p-4 lg:border-b-0 lg:border-r">
          <div className="space-y-2">
            {['Plan', 'Hire', 'Review', 'Ask'].map((item, index) => (
              <div
                className={
                  index === 0
                    ? 'rounded-md bg-surface-card px-3 py-2 text-sm font-semibold text-text shadow-sm'
                    : 'rounded-md px-3 py-2 text-sm font-semibold text-secondary'
                }
                key={item}
              >
                {item}
              </div>
            ))}
          </div>
        </aside>
        <div className="space-y-4 p-4 sm:p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
              Recommended next step
            </p>
            <h3 className="mt-2 font-editorial text-3xl font-semibold text-text">
              Generate the first roadmap
            </h3>
            <p className="mt-2 text-sm leading-6 text-secondary">
              Define what to build first, what to delay, and what to hand to a developer.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              ['MVP', 'Quote upload, risk summary, exportable brief'],
              ['Delay', 'Team roles, advanced analytics, custom integrations'],
              ['Ask', 'Clarify ownership of auth, payments, and handoff'],
            ].map(([label, text]) => (
              <div className="rounded-lg border border-subtle bg-surface-card p-3" key={label}>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  {label}
                </p>
                <p className="mt-2 text-sm leading-6 text-text">{text}</p>
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-accent/20 bg-accent-soft p-4">
            <p className="text-sm font-semibold text-text">Developer handoff</p>
            <p className="mt-2 text-sm leading-6 text-secondary">
              Send this brief before the estimate call so the conversation starts with scope,
              deliverables, and red flags.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const LandingPage = () => {
  const { status } = useAuth();
  const isAuthenticated = status === 'authenticated';
  const primaryCtaPath = isAuthenticated ? '/workspace' : '/register';
  const primaryCtaLabel = isAuthenticated ? 'Open workspace' : 'Start for $99';

  return (
    <div className="min-h-screen bg-background text-text">
      <header className="sticky top-0 z-40 border-b border-subtle bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link className="flex items-center gap-3" to="/">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-accent/25 bg-accent-soft font-editorial text-base font-semibold text-accent">
              G
            </div>
            <div>
              <p className="text-sm font-semibold tracking-normal">GhostCTO</p>
              <p className="text-xs text-muted">Technical clarity before you hire</p>
            </div>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-semibold text-secondary md:flex">
            <a className="hover:text-text" href="#outputs">
              Outputs
            </a>
            <a className="hover:text-text" href="#pricing">
              Pricing
            </a>
            <a className="hover:text-text" href="#faq">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              className="hidden text-sm font-semibold text-secondary hover:text-text sm:block"
              to={isAuthenticated ? '/workspace' : '/login'}
            >
              {isAuthenticated ? 'Workspace' : 'Sign in'}
            </Link>
            <Link className={primaryLink} to={primaryCtaPath}>
              {primaryCtaLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="paper-texture border-b border-subtle">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:px-8">
            <div className="animate-enter">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                Founder protection before the first build
              </p>
              <h1 className="mt-5 text-balance font-editorial text-5xl font-semibold leading-[0.98] tracking-normal text-text sm:text-6xl lg:text-7xl">
                Know what to build before you hire someone to build it.
              </h1>
              <p className="mt-6 max-w-2xl text-xl leading-8 text-secondary">
                GhostCTO helps non-technical founders understand scope, stack, cost signals, and
                red flags before money moves to a developer or agency.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link className={primaryLink} to={primaryCtaPath}>
                  {primaryCtaLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a className={secondaryLink} href="#how-it-works">
                  See how it works
                </a>
              </div>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {['Plain English', 'Developer-ready', 'Built for pre-hire clarity'].map((item) => (
                  <div className="flex items-center gap-2 text-sm font-semibold text-secondary" key={item}>
                    <CheckCircle2 className="h-4 w-4 text-accent" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="animate-rise">
              <ProductPreview />
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20" id="problems">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                Why this matters
              </p>
              <h2 className="mt-3 font-editorial text-4xl font-semibold text-text">
                The expensive mistakes usually happen before development starts.
              </h2>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {painPoints.map((point) => (
                <div className="rounded-panel border border-subtle bg-surface-card p-5 shadow-soft" key={point.title}>
                  <AlertTriangle className="h-5 w-5 text-clay" />
                  <h3 className="mt-4 text-lg font-semibold text-text">{point.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-secondary">{point.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-subtle bg-surface-soft py-16 sm:py-20" id="outputs">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                Product promise
              </p>
              <h2 className="mt-3 font-editorial text-4xl font-semibold text-text">
                Practical technical documents for founder decisions.
              </h2>
              <p className="mt-4 text-base leading-7 text-secondary">
                The workspace turns your idea, constraints, and vendor materials into outputs you
                can actually use before hiring, signing, or approving more scope.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {outputs.map((output) => (
                <div className="flex items-center gap-3 rounded-panel border border-subtle bg-surface-card p-4 shadow-sm" key={output}>
                  <FileText className="h-5 w-5 text-accent" />
                  <p className="text-sm font-semibold text-text">{output}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20" id="how-it-works">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                How it works
              </p>
              <h2 className="mt-3 font-editorial text-4xl font-semibold text-text">
                A calmer path from idea to developer handoff.
              </h2>
            </div>
            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {workflow.map((item, index) => (
                <div className="rounded-panel border border-subtle bg-surface-card p-5 shadow-soft" key={item.title}>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-accent/25 bg-accent-soft text-sm font-semibold text-accent">
                    {index + 1}
                  </span>
                  <h3 className="mt-5 text-lg font-semibold text-text">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-secondary">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-subtle bg-surface-card py-16 sm:py-20">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:px-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                Report preview
              </p>
              <h2 className="mt-3 font-editorial text-4xl font-semibold text-text">
                Designed to be sent to a developer.
              </h2>
              <p className="mt-4 text-base leading-7 text-secondary">
                Outputs read like structured planning documents, not chat transcripts. They help
                you brief vendors, compare quotes, and keep the first build focused.
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-subtle bg-background p-5 shadow-panel">
              <div className="border-b border-subtle pb-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                  Technical roadmap
                </p>
                <h3 className="mt-2 font-editorial text-3xl font-semibold text-text">
                  Marketplace MVP
                </h3>
                <p className="mt-2 text-sm leading-6 text-secondary">
                  Build the quote review workflow first. Delay team analytics and custom
                  integrations until paid usage proves the core path.
                </p>
              </div>
              <div className="grid gap-3 py-5 sm:grid-cols-3">
                {['Build first', 'Delay', 'Red flags'].map((label) => (
                  <div className="rounded-lg border border-subtle bg-surface-card p-3" key={label}>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                      {label}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-text">
                      {label === 'Build first'
                        ? 'Upload, review, export'
                        : label === 'Delay'
                          ? 'Dashboards and teams'
                          : 'Vague scope and ownership'}
                    </p>
                  </div>
                ))}
              </div>
              <div className="rounded-lg border border-accent/20 bg-accent-soft p-4">
                <p className="text-sm font-semibold text-text">What to tell your developer</p>
                <p className="mt-2 text-sm leading-6 text-secondary">
                  Estimate the quote review workflow as the first milestone and separate optional
                  enhancements from launch-critical work.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                Use cases
              </p>
              <h2 className="mt-3 font-editorial text-4xl font-semibold text-text">
                Built for the moments that cost real money.
              </h2>
            </div>
            <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {useCases.map((item) => (
                <div className="flex gap-3 rounded-panel border border-subtle bg-surface-card p-4 shadow-sm" key={item}>
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                  <p className="text-sm font-semibold leading-6 text-text">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-subtle bg-text py-16 text-surface-card sm:py-20" id="pricing">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_28rem] lg:items-center lg:px-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-soft">
                Pricing
              </p>
              <h2 className="mt-3 font-editorial text-4xl font-semibold">
                Spend less than a discovery call before you start hiring.
              </h2>
              <p className="mt-4 max-w-3xl text-base leading-7 text-surface-card/70">
                A focused workspace for scope, stack, quotes, hiring, reports, and project-aware
                technical guidance.
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-surface-card/15 bg-surface-card/10 p-6 shadow-panel">
              <p className="text-sm font-semibold text-accent-soft">Lifetime access</p>
              <div className="mt-4 flex items-end gap-2">
                <p className="font-editorial text-6xl font-semibold">$99</p>
                <p className="pb-2 text-sm text-surface-card/60">one-time</p>
              </div>
              <ul className="mt-6 space-y-3 text-sm leading-6 text-surface-card/75">
                {['Projects and planning workspace', 'Reports for developer handoff', 'Quote, code, and vendor review tools', 'PDF and markdown export where supported'].map((item) => (
                  <li className="flex gap-3" key={item}>
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent-soft" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link className={`${primaryLink} mt-6 w-full`} to={primaryCtaPath}>
                {primaryCtaLabel}
              </Link>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-[1.25rem] border border-subtle bg-surface-card p-6 shadow-soft">
              <div className="flex gap-4">
                <MessageCircle className="mt-1 h-5 w-5 shrink-0 text-accent" />
                <div>
                  <h2 className="font-editorial text-3xl font-semibold text-text">
                    A calm advisor, not a black box.
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-secondary">
                    GhostCTO helps you prepare and question technical work. It does not guarantee
                    vendor performance, final build cost, legal terms, security outcomes, or market
                    demand. Use it to make better decisions and ask better follow-up questions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-subtle bg-surface-soft py-16 sm:py-20" id="faq">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">FAQ</p>
            <h2 className="mt-3 font-editorial text-4xl font-semibold text-text">
              Clear answers before you start.
            </h2>
            <div className="mt-8 divide-y divide-subtle rounded-panel border border-subtle bg-surface-card shadow-soft">
              {faqs.map((faq) => (
                <details className="group p-5" key={faq.question}>
                  <summary className="cursor-pointer list-none text-base font-semibold tracking-normal text-text">
                    <span className="flex items-center justify-between gap-4">
                      {faq.question}
                      <span className="text-xl text-accent group-open:hidden">+</span>
                      <span className="hidden text-xl text-accent group-open:block">-</span>
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-6 text-secondary">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-16 text-center sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
              Final check
            </p>
            <h2 className="mt-3 text-balance font-editorial text-5xl font-semibold text-text">
              Before you hire, make the build legible.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-secondary">
              Know the first scope, the likely stack, the questions to ask, and the red flags to
              avoid before the first major invoice.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link className={primaryLink} to={primaryCtaPath}>
                {primaryCtaLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link className={secondaryLink} to={isAuthenticated ? '/workspace' : '/login'}>
                {isAuthenticated ? 'Open workspace' : 'Sign in'}
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
