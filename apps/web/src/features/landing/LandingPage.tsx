import { Link } from 'react-router-dom';

import { useAuth } from '../auth/auth-context';

const problems = [
  {
    description:
      'You know the business problem, but every vendor asks for technical decisions you are not ready to make.',
    title: 'Unclear scope',
  },
  {
    description:
      'Freelancers and agencies can sound confident while recommending stacks, timelines, or retainers that do not fit the stage.',
    title: 'Hard-to-check advice',
  },
  {
    description:
      'Hiring without a clear role brief makes it difficult to compare candidates or know what good answers should sound like.',
    title: 'Messy hiring signals',
  },
  {
    description:
      'Quotes arrive with vague milestones, hidden assumptions, and price ranges that are hard to challenge without technical context.',
    title: 'Weak negotiating position',
  },
];

const capabilities = [
  {
    description:
      'Turn the idea into a launch scope, roadmap, and technical spec a developer can actually estimate.',
    title: 'Scope the first build',
  },
  {
    description:
      'Compare stack choices against budget, timeline, founder skill level, and the product you need to launch.',
    title: 'Choose a practical stack',
  },
  {
    description:
      'Create role briefs, screening questions, take-home tasks, and evaluation rubrics for your first technical hire or contractor.',
    title: 'Hire with sharper questions',
  },
  {
    description:
      'Review code snippets, portfolios, proposals, and quotes so you can spot risk before money is committed.',
    title: 'Audit and negotiate better',
  },
];

const outputExamples = [
  {
    items: [
      'Launch feature list with explicit exclusions',
      'User roles, business rules, and acceptance criteria',
      'Developer-ready milestones for the first build',
    ],
    title: 'MVP scope brief',
  },
  {
    items: [
      'Frontend, backend, database, auth, hosting, and payment choices',
      'Plain-language tradeoffs for cost, speed, and future scale',
      'Risks to revisit before hiring or fundraising',
    ],
    title: 'Stack recommendation',
  },
  {
    items: [
      'Best-fit role title and engagement model',
      'Screening questions with strong-answer signals',
      'Practical work sample and evaluation rubric',
    ],
    title: 'Hiring packet',
  },
  {
    items: [
      'Proposal assumptions that need clarification',
      'Timeline and pricing risks to challenge',
      'Red flags before signing the statement of work',
    ],
    title: 'Quote review',
  },
];

const workflow = [
  {
    description:
      'Answer focused questions about your customer, business model, budget, timeline, and must-have features.',
    step: '01',
    title: 'Capture founder context',
  },
  {
    description:
      'Generate the planning documents, stack guidance, hiring materials, audits, and quote analysis you need for the next decision.',
    step: '02',
    title: 'Build the technical picture',
  },
  {
    description:
      'Use the outputs to brief developers, compare quotes, ask better questions, and avoid avoidable scope mistakes.',
    step: '03',
    title: 'Walk into vendor calls prepared',
  },
];

const audience = [
  'Non-technical founders validating a SaaS, marketplace, app, or internal tool',
  'Solo founders preparing to hire the first developer, freelancer, or agency',
  'Early teams that need a clear build plan before spending on implementation',
  'Founders reviewing proposals, code samples, portfolios, or vendor quotes',
];

const faqs = [
  {
    answer:
      'No. It gives founders stronger technical context before hiring, but complex products still benefit from experienced technical leadership.',
    question: 'Does GhostCTO replace a CTO?',
  },
  {
    answer:
      'It helps you define scope, choose a sensible stack, prepare hiring materials, review technical work, and challenge proposal assumptions.',
    question: 'What does it help me do before hiring?',
  },
  {
    answer:
      'No. The product is written for founders who need plain-language technical decisions, not engineering jargon.',
    question: 'Do I need technical experience?',
  },
  {
    answer:
      'It can identify pricing and timeline risks, but no software tool can guarantee the final cost of a custom build. Use it to ask better questions and narrow uncertainty.',
    question: 'Will it tell me exactly what my app should cost?',
  },
  {
    answer:
      'Yes. It can help with scope changes, code audits, quote reviews, developer vetting, and clearer follow-up documents after work begins.',
    question: 'Can I use it after I hire someone?',
  },
];

const primaryLinkClass =
  'inline-flex h-11 items-center justify-center rounded-md border border-[#0f766e] bg-[#0f766e] px-5 text-sm font-semibold tracking-normal text-white transition-colors hover:bg-[#115e59] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f6f3ec]';

const secondaryLinkClass =
  'inline-flex h-11 items-center justify-center rounded-md border border-[#b9ad9d] bg-transparent px-5 text-sm font-semibold tracking-normal text-[#10201f] transition-colors hover:border-[#0f766e] hover:text-[#0f766e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f6f3ec]';

const darkSecondaryLinkClass =
  'inline-flex h-11 items-center justify-center rounded-md border border-white/25 bg-transparent px-5 text-sm font-semibold tracking-normal text-white transition-colors hover:border-[#5eead4] hover:text-[#5eead4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5eead4]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#10201f]';

const SectionHeader = ({
  description,
  eyebrow,
  title,
}: {
  description: string;
  eyebrow: string;
  title: string;
}) => (
  <div className="max-w-3xl">
    <p className="text-sm font-semibold tracking-normal text-[#0f766e]">{eyebrow}</p>
    <h2 className="mt-3 text-3xl font-semibold tracking-normal text-[#10201f]">{title}</h2>
    <p className="mt-4 text-base leading-7 text-[#4f5f5c]">{description}</p>
  </div>
);

const ProductMockup = () => (
  <div
    aria-label="GhostCTO workspace preview"
    className="overflow-hidden rounded-xl border border-[#cfc6b8] bg-[#10201f] text-white shadow-[0_28px_90px_rgba(24,34,31,0.32)]"
  >
    <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ef4444]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#10b981]" />
      </div>
      <p className="text-xs font-medium tracking-normal text-white/60">Founder workspace</p>
    </div>

    <div className="grid gap-0 lg:grid-cols-[15rem_1fr]">
      <div className="border-b border-white/10 bg-[#162926] p-4 lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md border border-[#5eead4]/35 bg-[#5eead4]/10 text-sm font-semibold text-[#5eead4]">
            GC
          </div>
          <div>
            <p className="text-sm font-semibold tracking-normal">GhostCTO</p>
            <p className="text-xs text-white/60">Project readiness</p>
          </div>
        </div>
        <div className="mt-6 space-y-2">
          {['Scope', 'Stack', 'Hiring', 'Quote review'].map((item, index) => (
            <div
              className={`rounded-md px-3 py-2 text-sm ${
                index === 0
                  ? 'bg-[#5eead4]/10 text-[#5eead4]'
                  : 'bg-white/5 text-white/60'
              }`}
              key={item}
            >
              {item}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#f7f5ef] p-4 text-[#10201f] sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-[#0f766e]">
              Build plan
            </p>
            <h3 className="mt-2 text-xl font-semibold tracking-normal">
              Marketplace MVP before vendor calls
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#53625f]">
              Scope, stack, hiring questions, cost risks, and red flags in one founder-ready
              workspace.
            </p>
          </div>
          <div className="rounded-md border border-[#cfc6b8] bg-white px-3 py-2 text-sm font-semibold text-[#0f766e]">
            Ready to brief
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-lg border border-[#d8d0c2] bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-normal text-[#6b6257]">
              Recommended launch scope
            </p>
            <div className="mt-4 space-y-3">
              {[
                'Founder onboarding and project context',
                'Vendor brief with acceptance criteria',
                'Quote review before signing a build contract',
              ].map((item) => (
                <div className="flex gap-3 rounded-md bg-[#edf6f2] p-3" key={item}>
                  <span className="mt-1 h-2 w-2 rounded-full bg-[#0f766e]" />
                  <p className="text-sm leading-6 text-[#203330]">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-lg border border-[#d8d0c2] bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-normal text-[#6b6257]">
                Stack guidance
              </p>
              <p className="mt-3 text-sm leading-6 text-[#203330]">
                React, Node.js, PostgreSQL, auth, payments, and hosting choices tied to budget and
                launch speed.
              </p>
            </div>
            <div className="rounded-lg border border-[#d8d0c2] bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-normal text-[#6b6257]">
                Red flags
              </p>
              <p className="mt-3 text-sm leading-6 text-[#203330]">
                Undefined milestones, vague ownership of auth and payments, and missing acceptance
                criteria.
              </p>
            </div>
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
    <div className="min-h-screen bg-[#f6f3ec] text-[#10201f]">
      <header className="sticky top-0 z-40 border-b border-[#ded5c7] bg-[#f6f3ec]/95">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link className="flex items-center gap-3" to="/">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-[#0f766e]/35 bg-[#0f766e]/10 text-sm font-semibold text-[#0f766e]">
              GC
            </div>
            <div>
              <p className="text-sm font-semibold tracking-normal">GhostCTO</p>
              <p className="text-xs text-[#65716e]">AI technical co-founder</p>
            </div>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-[#53625f] md:flex">
            <a className="hover:text-[#0f766e]" href="#outputs">
              Outputs
            </a>
            <a className="hover:text-[#0f766e]" href="#pricing">
              Pricing
            </a>
            <a className="hover:text-[#0f766e]" href="#faq">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link className="hidden text-sm font-semibold text-[#53625f] hover:text-[#0f766e] sm:block" to={isAuthenticated ? '/workspace' : '/login'}>
              {isAuthenticated ? 'Workspace' : 'Sign in'}
            </Link>
            <Link className={primaryLinkClass} to={primaryCtaPath}>
              {primaryCtaLabel}
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="border-b border-[#ded5c7]">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
            <div className="max-w-5xl">
              <p className="text-sm font-semibold tracking-normal text-[#0f766e]">
                AI technical co-founder for non-technical founders
              </p>
              <h1 className="mt-4 text-5xl font-semibold tracking-normal text-[#10201f] lg:text-6xl">
                GhostCTO
              </h1>
              <p className="mt-6 max-w-4xl text-3xl font-semibold leading-tight tracking-normal text-[#10201f]">
                Before you hire a developer, spend $99 and know what to build, what stack to use,
                what to ask, what it should cost, and what red flags to avoid.
              </p>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-[#4f5f5c]">
                Most early software mistakes happen before the first line of code. GhostCTO helps
                you scope, hire, audit, and negotiate with clearer technical context.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link className={primaryLinkClass} to={primaryCtaPath}>
                  {primaryCtaLabel}
                </Link>
                <a className={secondaryLinkClass} href="#how-it-works">
                  See how it works
                </a>
              </div>
            </div>

            <div className="mt-10">
              <ProductMockup />
            </div>
          </div>
        </section>

        <section className="bg-[#10201f] py-16 text-white sm:py-20" id="problems">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold tracking-normal text-[#5eead4]">
                Problems founders face
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-normal">
                The expensive part is not always the code.
              </h2>
              <p className="mt-4 text-base leading-7 text-white/70">
                It is the unclear brief, the wrong first hire, the quote you cannot evaluate, and
                the technical decision you only understand after the invoice is paid.
              </p>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {problems.map((problem) => (
                <div className="rounded-lg border border-white/10 bg-white/5 p-5" key={problem.title}>
                  <h3 className="text-base font-semibold tracking-normal">{problem.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/70">{problem.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20" id="what-it-does">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeader
              description="Use GhostCTO before the vendor call, before the hiring interview, and before the scope becomes expensive to change."
              eyebrow="What GhostCTO does"
              title="Founder-ready technical planning in one workspace."
            />
            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {capabilities.map((capability) => (
                <div className="rounded-lg border border-[#d8d0c2] bg-white p-5" key={capability.title}>
                  <h3 className="text-lg font-semibold tracking-normal text-[#10201f]">
                    {capability.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-[#53625f]">
                    {capability.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#edf6f2] py-16 sm:py-20" id="outputs">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeader
              description="The point is not another generic chat. The point is usable material that helps you make the next founder decision with less guesswork."
              eyebrow="Example outputs"
              title="Concrete documents for the moments that cost money."
            />
            <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {outputExamples.map((output) => (
                <div className="rounded-lg border border-[#c7d8d0] bg-white p-5" key={output.title}>
                  <h3 className="text-base font-semibold tracking-normal text-[#10201f]">
                    {output.title}
                  </h3>
                  <ul className="mt-4 space-y-3">
                    {output.items.map((item) => (
                      <li className="flex gap-3 text-sm leading-6 text-[#53625f]" key={item}>
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0f766e]" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20" id="how-it-works">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeader
              description="A short workflow built for founders who need decisions, not a software engineering course."
              eyebrow="How it works"
              title="From idea context to practical technical materials."
            />
            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {workflow.map((item) => (
                <div className="rounded-lg border border-[#d8d0c2] bg-white p-5" key={item.step}>
                  <p className="text-sm font-semibold tracking-normal text-[#0f766e]">{item.step}</p>
                  <h3 className="mt-4 text-lg font-semibold tracking-normal text-[#10201f]">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-[#53625f]">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-16 sm:py-20">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
            <SectionHeader
              description="GhostCTO is for founders who are close enough to spend money on building, but not yet confident enough to judge the technical plan alone."
              eyebrow="Who it is for"
              title="Built for the pre-hire technical gap."
            />
            <div className="grid gap-3">
              {audience.map((item) => (
                <div className="rounded-lg border border-[#d8d0c2] bg-[#f7f5ef] p-4" key={item}>
                  <p className="text-sm font-medium leading-6 text-[#203330]">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#10201f] py-16 text-white sm:py-20" id="pricing">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_28rem] lg:items-center lg:px-8">
            <div>
              <p className="text-sm font-semibold tracking-normal text-[#5eead4]">Pricing</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-normal">
                Spend less than one discovery call before you start hiring.
              </h2>
              <p className="mt-4 max-w-3xl text-base leading-7 text-white/70">
                GhostCTO is a focused workspace for the founder decisions that happen before and
                during the first technical build.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/10 p-6">
              <p className="text-sm font-semibold tracking-normal text-[#5eead4]">
                Lifetime deal
              </p>
              <div className="mt-4 flex items-end gap-2">
                <p className="text-5xl font-semibold tracking-normal">$99</p>
                <p className="pb-2 text-sm text-white/60">one-time</p>
              </div>
              <ul className="mt-6 space-y-3 text-sm leading-6 text-white/70">
                <li>Project scoping and roadmap workspace</li>
                <li>Stack advice, technical specs, and hiring materials</li>
                <li>Code audits, developer vetting, and quote analysis</li>
                <li>PDF exports for sharing with vendors and advisors</li>
              </ul>
              <Link className={`${primaryLinkClass} mt-6 w-full`} to={primaryCtaPath}>
                {primaryCtaLabel}
              </Link>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20" id="faq">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <SectionHeader
              description="Straight answers for founders using GhostCTO before the first serious technical spend."
              eyebrow="FAQ"
              title="Know what it is and what it is not."
            />
            <div className="mt-8 divide-y divide-[#d8d0c2] rounded-xl border border-[#d8d0c2] bg-white">
              {faqs.map((faq) => (
                <details className="group p-5" key={faq.question}>
                  <summary className="cursor-pointer list-none text-base font-semibold tracking-normal text-[#10201f]">
                    <span className="flex items-center justify-between gap-4">
                      {faq.question}
                      <span className="text-xl text-[#0f766e] group-open:hidden">+</span>
                      <span className="hidden text-xl text-[#0f766e] group-open:block">-</span>
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-6 text-[#53625f]">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#10201f] px-4 py-16 text-white sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-5xl text-center">
            <p className="text-sm font-semibold tracking-normal text-[#5eead4]">Final check</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-normal">
              Before you hire a developer, get clear on the build.
            </h2>
            <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-white/70">
              Know what to build, what to ask, what it should cost, and where the red flags are
              before the first major invoice.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link className={primaryLinkClass} to={primaryCtaPath}>
                {primaryCtaLabel}
              </Link>
              <Link className={darkSecondaryLinkClass} to={isAuthenticated ? '/workspace' : '/login'}>
                {isAuthenticated ? 'Open workspace' : 'Sign in'}
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
