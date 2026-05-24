import type { BadgeProps } from '../../components/ui';
import type { Project, ProjectAnswer, ProjectDocument } from '../projects/project-types';

export type DemoOutputKey =
  | 'roadmap'
  | 'stackAdvice'
  | 'technicalSpec'
  | 'quoteAnalysis'
  | 'codeAudit';

export type DemoMetric = {
  label: string;
  tone: BadgeProps['variant'];
  value: string;
};

export type DemoSection = {
  items: string[];
  title: string;
};

export type DemoOutput = {
  artifactType: string;
  documentType: string;
  key: DemoOutputKey;
  metrics: DemoMetric[];
  sections: DemoSection[];
  summary: string;
  title: string;
  verdict: string;
  markdown: string;
};

const createdAt = '2026-05-12T14:00:00.000Z';
const updatedAt = '2026-05-19T16:30:00.000Z';

const createAnswer = (
  key: string,
  label: string,
  answer: string | string[],
  type = Array.isArray(answer) ? 'multi_select' : 'text',
): ProjectAnswer => ({
  answer,
  createdAt,
  id: `demo-answer-${key}`,
  key,
  label,
  metadata: {
    demoOnly: true,
  },
  type,
  updatedAt,
});

export const demoProjectName = 'CoachSlot';

export const demoProjectSummary =
  'A booking platform for independent fitness coaches to publish availability, sell private sessions, and manage client reschedules without manual messaging.';

export const demoOutputOrder: DemoOutputKey[] = [
  'roadmap',
  'stackAdvice',
  'technicalSpec',
  'quoteAnalysis',
  'codeAudit',
];

export const demoOutputs: Record<DemoOutputKey, DemoOutput> = {
  codeAudit: {
    artifactType: 'Implementation review',
    documentType: 'code_audit',
    key: 'codeAudit',
    markdown: `# CoachSlot Code Audit

Static demo audit of a fictional prototype repository. This is not customer code.

## Executive Summary

The prototype has a workable React surface and a recognizable Express API, but booking integrity and payment verification are not ready for paid traffic. The highest-risk issue is that booking conflicts are checked in the browser and not enforced in a database transaction.

## Critical Findings

1. Booking conflict protection is client-side only.
   Impact: Two clients can reserve the same coach slot if requests arrive close together.
   Fix: Add a server-side transaction with a unique constraint on coach, start time, and active status.

2. Payment completion trusts the return URL.
   Impact: A user could appear paid without a verified payment event.
   Fix: Process signed payment webhooks, store provider event IDs, and make fulfillment idempotent.

3. Time zones are stored as display strings.
   Impact: Reschedules around daylight saving changes can create incorrect availability.
   Fix: Store UTC timestamps, coach time zone, and generated local display values separately.

## Acceptable Areas

- Project structure separates API routes, services, and Prisma models.
- The frontend form states are typed and validation is centralized.
- Database migrations exist for core user and coach entities.

## Recommended Next Actions

- Pause new feature work until booking creation is made transactional.
- Add webhook signature verification and event replay protection.
- Add integration tests for concurrent booking attempts and refund flows.`,
    metrics: [
      { label: 'Overall risk', tone: 'danger', value: 'High' },
      { label: 'Critical findings', tone: 'danger', value: '3' },
      { label: 'Next checkpoint', tone: 'warning', value: 'Before beta' },
    ],
    sections: [
      {
        items: [
          'Move booking conflict checks into the API and enforce them with a database constraint.',
          'Verify payment completion from signed webhooks, not browser redirects.',
          'Normalize appointment times to UTC and preserve the coach time zone separately.',
        ],
        title: 'Priority findings',
      },
      {
        items: [
          'Route and service boundaries are understandable for a small team.',
          'Core entity migrations exist and can support a proper hardening pass.',
          'Frontend validation is typed enough to keep the handoff manageable.',
        ],
        title: 'Acceptable areas',
      },
    ],
    summary:
      'The fictional prototype is usable for internal review but should not process paid sessions until booking and payment safeguards are tightened.',
    title: 'CoachSlot Code Audit',
    verdict: 'Do not launch paid bookings before the booking transaction and payment webhook fixes are complete.',
  },
  quoteAnalysis: {
    artifactType: 'Vendor quote review',
    documentType: 'rate_validator',
    key: 'quoteAnalysis',
    markdown: `# CoachSlot Quote Analysis

Static demo analysis of a fictional vendor proposal. This is not a customer quote.

## Proposal Snapshot

- Vendor type: small agency
- Quote: USD 18,500 fixed bid
- Timeline: 5 weeks
- Scope: coach profiles, availability, checkout, booking management, admin review

## Price Fairness

The price is plausible for a narrowly scoped marketplace MVP, but the proposal is under-specified for payments, reschedules, refunds, and calendar behavior. The risk is less about the headline price and more about change orders once edge cases appear.

## Missing Deliverables

- Payment webhook handling and refund policy states
- Time zone behavior for coaches and clients in different cities
- Admin workflow for disputed bookings or coach profile changes
- Acceptance tests for double booking, cancellation, and failed payment paths

## Questions Before Signing

1. Which payment events are included and how will they be tested?
2. What happens when two clients book the same slot within the same minute?
3. Are reschedules included, and do they trigger notifications?
4. What admin screens are included in the fixed price?

## Negotiation Script

The fixed price may work if we lock the MVP boundary. Please revise the proposal to include payment webhook handling, booking conflict prevention, cancellation and refund states, and acceptance criteria for the booking flow. Anything outside those items can move to phase two.`,
    metrics: [
      { label: 'Risk score', tone: 'warning', value: '68/100' },
      { label: 'Quote', tone: 'neutral', value: '$18.5k fixed' },
      { label: 'Verdict', tone: 'warning', value: 'Under-scoped' },
    ],
    sections: [
      {
        items: [
          'The headline price is plausible for an MVP if the scope remains tight.',
          'The proposal does not specify payment webhooks, refund states, or double-booking prevention.',
          'Admin review and dispute handling are mentioned but not defined as deliverables.',
        ],
        title: 'Pricing read',
      },
      {
        items: [
          'Ask for explicit acceptance criteria before signing.',
          'Move calendar sync and subscriptions out of the first contract.',
          'Tie milestone payment to a tested booking flow, not only UI completion.',
        ],
        title: 'Founder action',
      },
    ],
    summary:
      'The sample quote could be workable, but only after tightening deliverables around payments, availability, and admin operations.',
    title: 'CoachSlot Quote Analysis',
    verdict: 'Negotiate scope clarity before signing.',
  },
  roadmap: {
    artifactType: 'Execution plan',
    documentType: 'roadmap',
    key: 'roadmap',
    markdown: `# CoachSlot Technical Roadmap

Static demo roadmap for a fictional startup idea. This is not customer data.

## MVP Goal

Launch a focused booking marketplace for local fitness coaches where a founder can validate coach supply, paid client demand, and reschedule operations before investing in broader marketplace automation.

## Phase 1: Booking Foundations, Weeks 1-3

- Coach profiles with service type, neighborhood, price, and short bio
- Availability blocks with server-side conflict checks
- Client booking request flow with account creation
- Basic admin review for coach profile edits

## Phase 2: Paid Session Flow, Weeks 4-6

- Hosted checkout for single-session payments
- Payment webhook processing before booking confirmation
- Cancellation and refund states with admin visibility
- Email notifications for booking, cancellation, and reschedule requests

## Phase 3: Operational Readiness, Weeks 7-10

- Coach dashboard for upcoming sessions and blocked times
- Client booking history and reschedule request tracking
- Admin queue for disputes, coach onboarding, and payment exceptions
- Lightweight analytics for conversion, supply coverage, and failed bookings

## Do Not Build Yet

- Native mobile apps
- Subscription memberships
- Automated coach matching
- Multi-location franchise tools

## Key Risks

- Marketplace liquidity is unproven until enough local coaches publish real availability.
- Calendar sync can become expensive if it is built before the booking model stabilizes.
- Payment and refund edge cases need explicit ownership before launch.`,
    metrics: [
      { label: 'MVP timeline', tone: 'accent', value: '8-10 weeks' },
      { label: 'First milestone', tone: 'success', value: 'Booking core' },
      { label: 'Deferred scope', tone: 'warning', value: '4 items' },
    ],
    sections: [
      {
        items: [
          'Start with coach profiles, availability blocks, and booking requests before payment automation.',
          'Add payment webhooks only after booking conflict rules are stable.',
          'Keep native mobile apps, subscriptions, and automated matching out of the MVP.',
        ],
        title: 'Build order',
      },
      {
        items: [
          'Confirm at least 10 local coaches are willing to publish real availability.',
          'Decide refund ownership before taking paid bookings.',
          'Use admin review for edge cases instead of over-building workflow automation.',
        ],
        title: 'Founder decisions',
      },
    ],
    summary:
      'The sample roadmap keeps the first release focused on validating local supply, paid demand, and the operational burden of reschedules.',
    title: 'CoachSlot Technical Roadmap',
    verdict: 'Build a paid booking MVP before adding matching, subscriptions, or native apps.',
  },
  stackAdvice: {
    artifactType: 'Stack recommendation',
    documentType: 'stack_advisor',
    key: 'stackAdvice',
    markdown: `# CoachSlot Stack Advice

Static demo stack recommendation for a fictional project. This is not customer data.

## Recommendation

Use a conventional TypeScript web stack with a managed database, hosted authentication, and hosted payment checkout. The founder should optimize for a reliable booking workflow and low operational complexity, not a custom marketplace platform.

## Recommended Layers

- Frontend: React, TypeScript, TailwindCSS
- Backend: Node.js, Express, Prisma
- Database: PostgreSQL
- Auth: Supabase Auth with email and Google sign-in
- Payments: hosted checkout and signed payment webhooks
- Email: transactional email provider for booking state changes
- Hosting: managed application hosting with separate web and API services
- Monitoring: error tracking plus API health checks

## Why This Fits

- The product is form-heavy and workflow-heavy, which suits a web app before native apps.
- PostgreSQL can enforce booking constraints better than a document database.
- Hosted auth and checkout reduce the amount of sensitive infrastructure the first team must operate.

## Avoid For MVP

- Microservices
- Custom calendar engine
- Native mobile apps
- Custom split-payment logic before marketplace demand is proven`,
    metrics: [
      { label: 'Complexity', tone: 'success', value: 'Moderate' },
      { label: 'Cost risk', tone: 'success', value: 'Low' },
      { label: 'Team', tone: 'neutral', value: '1 full-stack dev' },
    ],
    sections: [
      {
        items: [
          'Use React, TypeScript, TailwindCSS, Node.js, Express, Prisma, and PostgreSQL.',
          'Use hosted authentication and hosted checkout to reduce sensitive infrastructure.',
          'Add monitoring from day one because failed bookings and payments need quick diagnosis.',
        ],
        title: 'Recommended stack',
      },
      {
        items: [
          'Do not start with microservices or native mobile apps.',
          'Avoid a custom calendar engine until real coach scheduling patterns are known.',
          'Keep marketplace payout automation behind a manual admin process for the MVP.',
        ],
        title: 'Avoid early',
      },
    ],
    summary:
      'The sample stack favors a reliable, maintainable web MVP with strong booking data constraints and low operational overhead.',
    title: 'CoachSlot Stack Advice',
    verdict: 'Choose a conventional TypeScript web stack and defer custom marketplace infrastructure.',
  },
  technicalSpec: {
    artifactType: 'Developer handoff',
    documentType: 'technical_spec',
    key: 'technicalSpec',
    markdown: `# CoachSlot Technical Spec: Availability and Booking Flow

Static demo spec for a fictional feature. This is not customer data.

## Feature Goal

Allow a client to book one open coach session while preventing double booking, confirming payment status, and giving admins enough visibility to resolve exceptions.

## Core User Stories

- As a coach, I can publish available time blocks for a specific service and price.
- As a client, I can select a coach, choose an open slot, and submit booking details.
- As an admin, I can see bookings that failed payment, were cancelled, or need manual review.

## Data Changes

- CoachAvailability: coachId, serviceId, startsAtUtc, endsAtUtc, status, timezone
- Booking: clientId, coachId, availabilityId, status, paymentStatus, cancellationReason
- PaymentEvent: bookingId, providerEventId, eventType, processedAt

## API Endpoints

- GET /coaches/:coachId/availability
- POST /bookings
- POST /payments/webhook
- PATCH /bookings/:bookingId/cancel
- GET /admin/bookings/review

## Acceptance Criteria

- A booking cannot be created if the slot is already held, confirmed, cancelled late, or blocked.
- Payment confirmation is based on a signed webhook event, not a browser redirect.
- The client sees clear recovery states for failed payment, unavailable slot, and expired hold.
- Admins can identify payment exceptions without querying the database.

## Test Cases

- Two clients attempt to book the same slot at the same time.
- Payment succeeds after the client closes the checkout tab.
- A coach cancels a slot with an existing booking.
- A client views availability from a different time zone.`,
    metrics: [
      { label: 'Priority', tone: 'danger', value: 'Critical' },
      { label: 'Endpoints', tone: 'accent', value: '5' },
      { label: 'Test focus', tone: 'warning', value: 'Concurrency' },
    ],
    sections: [
      {
        items: [
          'Create availability, booking, and payment event records with clear status fields.',
          'Use a transactional booking endpoint to hold or confirm one slot at a time.',
          'Expose admin review for payment exceptions and cancellation disputes.',
        ],
        title: 'Implementation scope',
      },
      {
        items: [
          'Double-booking attempts must fail predictably.',
          'Payment confirmation must come from a signed webhook.',
          'Client-facing errors must explain the next recoverable action.',
        ],
        title: 'Acceptance criteria',
      },
    ],
    summary:
      'The sample spec translates the booking flow into API, data, permission, and test details that a developer can estimate and build against.',
    title: 'CoachSlot Technical Spec',
    verdict: 'Treat booking integrity and payment confirmation as critical-path requirements.',
  },
};

const createDemoDocument = (key: DemoOutputKey, index: number): ProjectDocument => {
  const output = demoOutputs[key];

  return {
    completedAt: updatedAt,
    content: output.markdown,
    createdAt,
    id: `demo-doc-${key}`,
    metadata: {
      demoOnly: true,
      outputKey: key,
      source: 'static_sample',
    },
    projectId: 'demo-project-coachslot',
    status: 'COMPLETED',
    summary: output.summary,
    title: output.title,
    type: output.documentType,
    updatedAt,
    version: index + 1,
  };
};

export const demoProject: Project = {
  answers: [
    createAnswer('ideaSummary', 'Idea summary', demoProjectSummary),
    createAnswer(
      'targetCustomer',
      'Target customer',
      'Independent fitness coaches in a single metro area who currently manage bookings through direct messages and spreadsheets.',
    ),
    createAnswer('currentStage', 'Current stage', 'prototype'),
    createAnswer('productType', 'Product type', 'marketplace'),
    createAnswer('budgetRange', 'Budget range', '15000_50000'),
    createAnswer('launchTimeline', 'Launch timeline', '8_to_12_weeks'),
    createAnswer('founderTechnicalLevel', 'Founder technical level', 'non_technical'),
    createAnswer('monetization', 'Monetization', 'transaction_fee'),
    createAnswer('industry', 'Industry', 'Local fitness and wellness'),
    createAnswer('existingAssets', 'Existing assets', [
      'customer_interviews',
      'waitlist',
      'landing_page',
      'designs',
    ]),
    createAnswer('mustHaveFeatures', 'Must-have features', [
      'Coach profiles with services, price, and neighborhood',
      'Availability calendar with booking conflict protection',
      'Client booking and hosted checkout flow',
      'Admin review for coaches, cancellations, and payment exceptions',
    ]),
    createAnswer(
      'biggestConcern',
      'Biggest concern',
      'Spending the first budget on marketplace features before validating whether coaches will keep their availability current.',
    ),
  ],
  biggestConcern:
    'Spending the first budget on marketplace features before validating whether coaches will keep their availability current.',
  budgetRange: '15000_50000',
  createdAt,
  currentStage: 'prototype',
  documents: demoOutputOrder.map(createDemoDocument),
  existingAssets: ['customer_interviews', 'waitlist', 'landing_page', 'designs'],
  founderTechnicalLevel: 'non_technical',
  id: 'demo-project-coachslot',
  ideaSummary: demoProjectSummary,
  industry: 'Local fitness and wellness',
  launchTimeline: '8_to_12_weeks',
  monetization: 'transaction_fee',
  mustHaveFeatures: [
    'Coach profiles with services, price, and neighborhood',
    'Availability calendar with booking conflict protection',
    'Client booking and hosted checkout flow',
    'Admin review for coaches, cancellations, and payment exceptions',
  ],
  name: demoProjectName,
  productType: 'marketplace',
  slug: 'coachslot-demo',
  status: 'ACTIVE',
  targetCustomer:
    'Independent fitness coaches in a single metro area who currently manage bookings through direct messages and spreadsheets.',
  updatedAt,
};

export const demoSampleNotice =
  'Fictional sample output for demo and marketing use only. Not customer data.';
