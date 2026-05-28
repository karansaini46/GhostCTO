import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  PageHeader,
  Select,
  Tabs,
  Textarea,
  type TabItem,
} from '../../components/ui';
import { ApiError } from '../../lib/api';
import { useAuth } from '../auth/auth-context';
import { DocumentFeedbackPanel } from './DocumentFeedbackPanel';
import { GenerationLimitCallout } from './generation-errors';
import { getGenerationErrorMessage, isGenerationLimitError } from './generation-error-utils';
import {
  exportProjectDocumentPdfRequest,
  generateTechnicalSpecRequest,
  getProjectRequest,
  listProjectDocumentsRequest,
} from './project-api';
import { getProjectOptionLabel } from './project-options';
import type { Project, ProjectDocument, ProjectDocumentFeedback } from './project-types';
import type {
  TechnicalSpecDocumentMetadata,
  TechnicalSpecGenerationInput,
  TechnicalSpecOutput,
  TechnicalSpecPriority,
} from './technical-spec-types';

type SpecFormState = {
  businessRules: string;
  constraints: string;
  desiredUserOutcome: string;
  examples: string;
  featureName: string;
  priority: TechnicalSpecPriority;
  userRoles: string;
};

type SpecFormErrors = Partial<Record<keyof SpecFormState, string>>;

type CopyButtonProps = {
  label: string;
  onCopied: (label: string) => void;
  value: string;
  variant?: 'secondary' | 'ghost';
};

const initialFormState: SpecFormState = {
  businessRules: '',
  constraints: '',
  desiredUserOutcome: '',
  examples: '',
  featureName: '',
  priority: 'medium',
  userRoles: '',
};

const priorityOptions: Array<{ label: string; value: TechnicalSpecPriority }> = [
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Critical', value: 'critical' },
  { label: 'Low', value: 'low' },
];

const specProgress = [
  'Reading the project context and feature inputs.',
  'Turning founder notes into build-ready requirements.',
  'Checking API, data, permissions, and failure paths.',
  'Preparing the developer handoff and test plan.',
];

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));

const formatTime = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));

const formatLabel = (value: string | null | undefined) => {
  if (!value) {
    return 'Not set';
  }

  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const wordCount = (value: string) => value.trim().split(/\s+/).filter(Boolean).length;

const parseLines = (value: string) =>
  value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

const formatBullets = (items: string[]) => items.map((item) => `- ${item}`).join('\n');

const copyText = async (value: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
};

const slugify = (value: string) => {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 72);

  return slug || 'technical-spec';
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const exportMarkdown = (fileName: string, content: string) => {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  downloadBlob(blob, `${slugify(fileName)}.md`);
};

const validateList = ({
  items,
  label,
  maxItems = 12,
  maxCharactersPerItem = 220,
  minItems,
  minWordsPerItem,
}: {
  items: string[];
  label: string;
  maxCharactersPerItem?: number;
  maxItems?: number;
  minItems: number;
  minWordsPerItem: number;
}) => {
  if (items.length < minItems) {
    return `${label} needs at least ${minItems} specific ${minItems === 1 ? 'item' : 'items'}.`;
  }

  if (items.length > maxItems) {
    return `${label} should use ${maxItems} items or fewer.`;
  }

  if (items.some((item) => item.length > maxCharactersPerItem)) {
    return `${label} should keep each line under ${maxCharactersPerItem} characters.`;
  }

  if (items.some((item) => wordCount(item) < minWordsPerItem)) {
    return `${label} should use complete, specific lines instead of short labels.`;
  }

  return undefined;
};

const validateSpecForm = (state: SpecFormState): SpecFormErrors => {
  const errors: SpecFormErrors = {};
  const userRoles = parseLines(state.userRoles);
  const businessRules = parseLines(state.businessRules);
  const constraints = parseLines(state.constraints);
  const examples = parseLines(state.examples);

  if (state.featureName.trim().length < 3) {
    errors.featureName = 'Use the actual feature name your developer will recognize.';
  }

  if (state.desiredUserOutcome.trim().length < 60 || wordCount(state.desiredUserOutcome) < 10) {
    errors.desiredUserOutcome =
      'Describe the outcome in enough detail to explain who benefits and what changes for them.';
  }

  const userRolesError = validateList({
    items: userRoles,
    label: 'User roles',
    minItems: 1,
    minWordsPerItem: 1,
  });
  if (userRolesError) {
    errors.userRoles = userRolesError;
  }

  const businessRulesError = validateList({
    items: businessRules,
    label: 'Business rules',
    minItems: 2,
    minWordsPerItem: 4,
  });
  if (businessRulesError) {
    errors.businessRules = businessRulesError;
  }

  const constraintsError = validateList({
    items: constraints,
    label: 'Constraints',
    minItems: 1,
    minWordsPerItem: 3,
  });
  if (constraintsError) {
    errors.constraints = constraintsError;
  }

  const examplesError = validateList({
    items: examples,
    label: 'Examples',
    minItems: 2,
    minWordsPerItem: 5,
  });
  if (examplesError) {
    errors.examples = examplesError;
  }

  if (userRoles.length + businessRules.length + examples.length > 12) {
    errors.examples = 'Keep user roles, business rules, and examples to 12 lines total.';
  }

  return errors;
};

const buildGenerationPayload = (state: SpecFormState): TechnicalSpecGenerationInput => {
  const userRoles = parseLines(state.userRoles);
  const businessRules = parseLines(state.businessRules);
  const constraints = parseLines(state.constraints);
  const examples = parseLines(state.examples);

  return {
    constraints,
    existingSystemNotes: [
      ...userRoles.map((role) => `User role: ${role}`),
      ...businessRules.map((rule) => `Business rule: ${rule}`),
      ...examples.map((example) => `Example: ${example}`),
    ],
    featureDescription: [
      'Desired user outcome:',
      state.desiredUserOutcome.trim(),
      '',
      'User roles:',
      formatBullets(userRoles),
      '',
      'Business rules:',
      formatBullets(businessRules),
      '',
      'Examples:',
      formatBullets(examples),
    ].join('\n'),
    featureName: state.featureName.trim(),
    priority: state.priority,
  };
};

const isTechnicalSpecOutput = (value: unknown): value is TechnicalSpecOutput => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const output = value as Partial<TechnicalSpecOutput> & { moduleType?: unknown };

  return (
    (output.moduleType === 'technical_spec' || output.moduleType === 'TECH_SPEC') &&
    typeof output.reportMarkdown === 'string' &&
    Boolean(output.featureOverview) &&
    Array.isArray(output.userStories) &&
    Array.isArray(output.apiEndpoints) &&
    Array.isArray(output.databaseChanges) &&
    Array.isArray(output.edgeCases) &&
    Array.isArray(output.testCases) &&
    Array.isArray(output.implementationSequence)
  );
};

const isTechnicalSpecMetadata = (value: unknown): value is TechnicalSpecDocumentMetadata => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return 'technicalSpec' in value;
};

const getDocumentTechnicalSpec = (document: ProjectDocument): TechnicalSpecOutput | null => {
  if (!isTechnicalSpecMetadata(document.metadata)) {
    return null;
  }

  return isTechnicalSpecOutput(document.metadata.technicalSpec)
    ? document.metadata.technicalSpec
    : null;
};

const CopyButton = ({ label, onCopied, value, variant = 'secondary' }: CopyButtonProps) => (
  <Button
    onClick={async () => {
      await copyText(value);
      onCopied(label);
    }}
    size="sm"
    variant={variant}
  >
    Copy
  </Button>
);

const DetailBlock = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-panel border border-subtle bg-surface-card shadow-sm p-4">
    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{label}</p>
    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-text">{value}</p>
  </div>
);

const ListBlock = ({ items }: { items: string[] }) => (
  <div className="grid gap-2">
    {items.map((item) => (
      <div
        className="rounded-panel border border-subtle bg-surface-card shadow-sm px-3 py-2 text-sm leading-6 text-text"
        key={item}
      >
        {item}
      </div>
    ))}
  </div>
);

const CodeBlock = ({ value }: { value: string }) => (
  <pre className="max-h-80 overflow-auto rounded-md border border-border bg-background p-4 text-sm leading-6 text-text">
    {value}
  </pre>
);

const buildOverviewText = (output: TechnicalSpecOutput) =>
  [
    'Feature overview',
    output.featureOverview.summary,
    '',
    `Problem: ${output.featureOverview.problem}`,
    `Goal: ${output.featureOverview.goal}`,
    `Priority rationale: ${output.featureOverview.priorityRationale}`,
    '',
    'Assumptions:',
    formatBullets(
      output.assumptions.map((assumption) => `${assumption.text} (${assumption.reason})`),
    ),
    '',
    'Out of scope:',
    formatBullets(output.outOfScope),
  ].join('\n');

const buildStoriesText = (output: TechnicalSpecOutput) =>
  [
    'User stories:',
    ...output.userStories.map(
      (story) =>
        `- ${story.story} Actor: ${story.actor}. Goal: ${story.goal}. Benefit: ${story.benefit}.`,
    ),
    '',
    'User flows:',
    ...output.userFlows.map((flow) =>
      [
        `${flow.title} (${flow.actor})`,
        formatBullets(flow.steps),
        `Success outcome: ${flow.successOutcome}`,
        `Failure handling: ${flow.failureHandling}`,
      ].join('\n'),
    ),
  ].join('\n');

const buildApiText = (output: TechnicalSpecOutput) =>
  output.apiEndpoints
    .map((endpoint) =>
      [
        `${endpoint.method} ${endpoint.path}`,
        endpoint.purpose,
        `Auth: ${endpoint.auth}`,
        '',
        'Request fields:',
        formatBullets(endpoint.requestBody),
        '',
        'Response fields:',
        formatBullets(endpoint.responseBody),
        '',
        'Request example:',
        endpoint.requestExample,
        '',
        'Response example:',
        endpoint.responseExample,
        '',
        'Error states:',
        formatBullets(endpoint.errorStates),
      ].join('\n'),
    )
    .join('\n\n');

const buildDatabaseText = (output: TechnicalSpecOutput) =>
  [
    'Database changes:',
    ...output.databaseChanges.map((change) =>
      [
        `${formatLabel(change.changeType)} ${change.entity}`,
        `Fields: ${change.fields.length ? change.fields.join(', ') : 'None'}`,
        `Relationships: ${change.relationships.length ? change.relationships.join(', ') : 'None'}`,
        `Migration notes: ${change.migrationNotes}`,
      ].join('\n'),
    ),
    '',
    'Permissions:',
    ...output.permissions.map(
      (permission) =>
        `- ${permission.actor}: ${formatLabel(permission.accessLevel)}. ${permission.requirement} Enforcement: ${permission.enforcement}`,
    ),
    '',
    'Analytics events:',
    ...output.analyticsEvents.map(
      (event) =>
        `- ${event.eventName}: ${event.trigger}. Properties: ${event.properties.join(', ') || 'None'}. Purpose: ${event.purpose}`,
    ),
  ].join('\n');

const buildEdgeCasesText = (output: TechnicalSpecOutput) =>
  [
    'Edge cases:',
    ...output.edgeCases.map(
      (edgeCase) =>
        `- ${edgeCase.case}: ${edgeCase.expectedBehavior}. Handling: ${edgeCase.handling}`,
    ),
    '',
    'Error states:',
    ...output.errorStates.map(
      (errorState) =>
        `- ${errorState.statusCode ? `${errorState.statusCode} ` : ''}${errorState.condition}: ${errorState.message}. Recovery: ${errorState.recovery}`,
    ),
  ].join('\n');

const buildTestsText = (output: TechnicalSpecOutput) =>
  [
    'Acceptance criteria:',
    ...output.acceptanceCriteria.map(
      (criterion) => `- ${criterion.criterion} Verification: ${criterion.verification}`,
    ),
    '',
    'Test cases:',
    ...output.testCases.map((testCase) =>
      [
        `${formatLabel(testCase.testType)}: ${testCase.scenario}`,
        `Steps: ${testCase.steps.join(' -> ')}`,
        `Expected result: ${testCase.expectedResult}`,
      ].join('\n'),
    ),
  ].join('\n');

const buildHandoffText = (output: TechnicalSpecOutput) =>
  [
    'Implementation sequence:',
    ...output.implementationSequence.map((step) =>
      [
        `${step.order}. ${step.title}`,
        step.work,
        `Dependencies: ${step.dependencies.length ? step.dependencies.join(', ') : 'None'}`,
        `Verification: ${step.verification}`,
      ].join('\n'),
    ),
    '',
    'Out of scope:',
    formatBullets(output.outOfScope),
  ].join('\n');

const buildSpecTabs = (
  output: TechnicalSpecOutput,
  onCopied: (label: string) => void,
): TabItem[] => [
  {
    content: (
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-text">Feature overview</h2>
            <p className="mt-1 text-sm leading-6 text-muted">{output.featureOverview.summary}</p>
          </div>
          <CopyButton label="Overview" onCopied={onCopied} value={buildOverviewText(output)} />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <DetailBlock label="Problem" value={output.featureOverview.problem} />
          <DetailBlock label="Goal" value={output.featureOverview.goal} />
          <DetailBlock
            label="Priority rationale"
            value={output.featureOverview.priorityRationale}
          />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <h3 className="mb-3 text-sm font-semibold text-text">Assumptions</h3>
            <div className="grid gap-3">
              {output.assumptions.map((assumption) => (
                <DetailBlock
                  key={assumption.text}
                  label={assumption.text}
                  value={assumption.reason}
                />
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold text-text">Out of scope</h3>
            <ListBlock items={output.outOfScope} />
          </div>
        </div>
      </div>
    ),
    label: 'Overview',
    value: 'overview',
  },
  {
    content: (
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-text">User stories and flows</h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Actor, goal, benefit, and delivery flow.
            </p>
          </div>
          <CopyButton label="User stories" onCopied={onCopied} value={buildStoriesText(output)} />
        </div>
        <div className="grid gap-4">
          {output.userStories.map((story) => (
            <div
              className="rounded-panel border border-subtle bg-surface-card shadow-sm p-4"
              key={story.story}
            >
              <p className="text-sm font-semibold text-text">{story.story}</p>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <DetailBlock label="Actor" value={story.actor} />
                <DetailBlock label="Goal" value={story.goal} />
                <DetailBlock label="Benefit" value={story.benefit} />
              </div>
            </div>
          ))}
        </div>
        <div className="grid gap-4">
          {output.userFlows.map((flow) => (
            <div
              className="rounded-panel border border-subtle bg-surface-card shadow-sm p-4"
              key={flow.title}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-text">{flow.title}</h3>
                <Badge>{flow.actor}</Badge>
              </div>
              <div className="mt-4">
                <ListBlock items={flow.steps} />
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <DetailBlock label="Success outcome" value={flow.successOutcome} />
                <DetailBlock label="Failure handling" value={flow.failureHandling} />
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    label: 'User Stories',
    value: 'stories',
  },
  {
    content: (
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-text">API endpoints</h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Endpoint shape, examples, auth, and failures.
            </p>
          </div>
          <CopyButton label="API" onCopied={onCopied} value={buildApiText(output)} />
        </div>
        <div className="grid gap-4">
          {output.apiEndpoints.map((endpoint) => (
            <div
              className="rounded-panel border border-subtle bg-surface-card shadow-sm p-4"
              key={`${endpoint.method}-${endpoint.path}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Badge variant="accent">{endpoint.method}</Badge>
                  <h3 className="mt-3 font-mono text-sm text-text">{endpoint.path}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{endpoint.purpose}</p>
                </div>
                <Badge>{endpoint.auth}</Badge>
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <DetailBlock label="Request fields" value={formatBullets(endpoint.requestBody)} />
                <DetailBlock label="Response fields" value={formatBullets(endpoint.responseBody)} />
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                    Request example
                  </p>
                  <CodeBlock value={endpoint.requestExample} />
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                    Response example
                  </p>
                  <CodeBlock value={endpoint.responseExample} />
                </div>
              </div>
              <div className="mt-4">
                <DetailBlock
                  label="Endpoint error states"
                  value={formatBullets(endpoint.errorStates)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    label: 'API',
    value: 'api',
  },
  {
    content: (
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-text">Database, permissions, and events</h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Data changes and access rules tied to the feature.
            </p>
          </div>
          <CopyButton label="Database" onCopied={onCopied} value={buildDatabaseText(output)} />
        </div>
        <div className="grid gap-4">
          {output.databaseChanges.map((change) => (
            <div
              className="rounded-panel border border-subtle bg-surface-card shadow-sm p-4"
              key={`${change.changeType}-${change.entity}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-text">{change.entity}</h3>
                <Badge>{formatLabel(change.changeType)}</Badge>
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                <DetailBlock
                  label="Fields"
                  value={change.fields.length ? formatBullets(change.fields) : 'None'}
                />
                <DetailBlock
                  label="Relationships"
                  value={change.relationships.length ? formatBullets(change.relationships) : 'None'}
                />
                <DetailBlock label="Migration notes" value={change.migrationNotes} />
              </div>
            </div>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <h3 className="mb-3 text-sm font-semibold text-text">Permissions</h3>
            <div className="grid gap-3">
              {output.permissions.map((permission) => (
                <DetailBlock
                  key={`${permission.actor}-${permission.requirement}`}
                  label={`${permission.actor}: ${formatLabel(permission.accessLevel)}`}
                  value={`${permission.requirement}\n${permission.enforcement}`}
                />
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold text-text">Analytics events</h3>
            <div className="grid gap-3">
              {output.analyticsEvents.map((event) => (
                <DetailBlock
                  key={event.eventName}
                  label={event.eventName}
                  value={`${event.trigger}\nProperties: ${event.properties.join(', ') || 'None'}\n${event.purpose}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
    label: 'Database',
    value: 'database',
  },
  {
    content: (
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-text">Edge cases and error states</h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              What can go wrong and what the product should do.
            </p>
          </div>
          <CopyButton label="Edge cases" onCopied={onCopied} value={buildEdgeCasesText(output)} />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <h3 className="mb-3 text-sm font-semibold text-text">Edge cases</h3>
            <div className="grid gap-3">
              {output.edgeCases.map((edgeCase) => (
                <DetailBlock
                  key={edgeCase.case}
                  label={edgeCase.case}
                  value={`${edgeCase.expectedBehavior}\n${edgeCase.handling}`}
                />
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold text-text">Error states</h3>
            <div className="grid gap-3">
              {output.errorStates.map((errorState) => (
                <DetailBlock
                  key={`${errorState.condition}-${errorState.message}`}
                  label={`${errorState.statusCode ? `${errorState.statusCode} ` : ''}${errorState.condition}`}
                  value={`${errorState.message}\n${errorState.recovery}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
    label: 'Edge Cases',
    value: 'edge-cases',
  },
  {
    content: (
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-text">Acceptance and tests</h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              How the build should be verified before release.
            </p>
          </div>
          <CopyButton label="Tests" onCopied={onCopied} value={buildTestsText(output)} />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <h3 className="mb-3 text-sm font-semibold text-text">Acceptance criteria</h3>
            <div className="grid gap-3">
              {output.acceptanceCriteria.map((criterion) => (
                <DetailBlock
                  key={criterion.criterion}
                  label={criterion.criterion}
                  value={criterion.verification}
                />
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold text-text">Test cases</h3>
            <div className="grid gap-3">
              {output.testCases.map((testCase) => (
                <DetailBlock
                  key={`${testCase.testType}-${testCase.scenario}`}
                  label={`${formatLabel(testCase.testType)}: ${testCase.scenario}`}
                  value={`${formatBullets(testCase.steps)}\nExpected: ${testCase.expectedResult}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
    label: 'Tests',
    value: 'tests',
  },
  {
    content: (
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-text">Developer handoff</h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Build order, verification, and the full markdown report.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <CopyButton label="Handoff" onCopied={onCopied} value={buildHandoffText(output)} />
            <Button
              onClick={() => exportMarkdown('technical-spec-handoff', output.reportMarkdown)}
              size="sm"
              variant="secondary"
            >
              Export markdown
            </Button>
          </div>
        </div>
        <div className="grid gap-3">
          {output.implementationSequence
            .slice()
            .sort((first, second) => first.order - second.order)
            .map((step) => (
              <div
                className="rounded-panel border border-subtle bg-surface-card shadow-sm p-4"
                key={`${step.order}-${step.title}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-text">
                    {step.order}. {step.title}
                  </h3>
                  <Badge>
                    {step.dependencies.length
                      ? `${step.dependencies.length} dependencies`
                      : 'No dependencies'}
                  </Badge>
                </div>
                <p className="mt-3 text-sm leading-6 text-text">{step.work}</p>
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  <DetailBlock
                    label="Dependencies"
                    value={step.dependencies.length ? formatBullets(step.dependencies) : 'None'}
                  />
                  <DetailBlock label="Verification" value={step.verification} />
                </div>
              </div>
            ))}
        </div>
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-text">Full markdown report</h3>
            <CopyButton
              label="Full report"
              onCopied={onCopied}
              value={output.reportMarkdown}
              variant="ghost"
            />
          </div>
          <div className="max-h-[520px] overflow-auto rounded-panel border border-subtle bg-surface-card shadow-sm p-4 whitespace-pre-wrap text-sm leading-6 text-text">
            {output.reportMarkdown}
          </div>
        </div>
      </div>
    ),
    label: 'Handoff',
    value: 'handoff',
  },
];

export const TechnicalSpecPage = () => {
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  const { id } = useParams();
  const [activeOutput, setActiveOutput] = useState<TechnicalSpecOutput | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<SpecFormErrors>({});
  const [formState, setFormState] = useState<SpecFormState>(initialFormState);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [limitMessage, setLimitMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [progressIndex, setProgressIndex] = useState(0);
  const [project, setProject] = useState<Project | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);

  const loadWorkspace = useCallback(async () => {
    if (!accessToken || !id) {
      return;
    }

    setIsLoading(true);
    setLoadError(null);
    setGenerationError(null);
    setLimitMessage(null);

    try {
      const [projectResponse, documentsResponse] = await Promise.all([
        getProjectRequest(accessToken, id),
        listProjectDocumentsRequest(accessToken, id, 'technical_spec'),
      ]);

      setProject(projectResponse.project);
      setDocuments(documentsResponse.documents);
    } catch {
      setLoadError('Unable to load the technical spec workspace.');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, id]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    if (!documents.length) {
      return;
    }

    if (selectedDocumentId && documents.some((document) => document.id === selectedDocumentId)) {
      return;
    }

    const latestDocument = documents[0];
    setSelectedDocumentId(latestDocument.id);
    const output = getDocumentTechnicalSpec(latestDocument);
    if (output) {
      setActiveOutput(output);
    }
  }, [documents, selectedDocumentId]);

  useEffect(() => {
    if (!isGenerating) {
      setProgressIndex(0);
      return;
    }

    const timer = window.setInterval(() => {
      setProgressIndex((current) => (current + 1) % specProgress.length);
    }, 1200);

    return () => window.clearInterval(timer);
  }, [isGenerating]);

  useEffect(() => {
    if (!copiedLabel) {
      return;
    }

    const timeout = window.setTimeout(() => setCopiedLabel(null), 1800);
    return () => window.clearTimeout(timeout);
  }, [copiedLabel]);

  const selectedDocument = useMemo(
    () => documents.find((document) => document.id === selectedDocumentId) ?? null,
    [documents, selectedDocumentId],
  );

  const selectedDocumentOutput = useMemo(
    () => (selectedDocument ? getDocumentTechnicalSpec(selectedDocument) : null),
    [selectedDocument],
  );

  const currentOutput = activeOutput ?? selectedDocumentOutput;
  const currentMarkdown = currentOutput?.reportMarkdown ?? selectedDocument?.content ?? '';
  const historyDocuments = documents.filter((document) => document.type === 'technical_spec');
  const tabs = useMemo(
    () => (currentOutput ? buildSpecTabs(currentOutput, setCopiedLabel) : []),
    [currentOutput],
  );

  const updateFormField = useCallback(
    <Field extends keyof SpecFormState>(field: Field, value: SpecFormState[Field]) => {
      setFormState((current) => ({ ...current, [field]: value }));
      if (formErrors[field]) {
        setFormErrors((current) => ({ ...current, [field]: undefined }));
      }
    },
    [formErrors],
  );

  const handleGenerate = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!accessToken || !id) {
        return;
      }

      const nextErrors = validateSpecForm(formState);
      if (Object.keys(nextErrors).length > 0) {
        setFormErrors(nextErrors);
        return;
      }

      setIsGenerating(true);
      setGenerationError(null);
      setLimitMessage(null);

      try {
        const payload = buildGenerationPayload(formState);
        const response = await generateTechnicalSpecRequest(accessToken, id, payload);

        setActiveOutput(response.technicalSpec);
        setActiveTab('overview');
        setSelectedDocumentId(response.document.id);
        setDocuments((current) => {
          const existing = current.filter((document) => document.id !== response.document.id);
          return [response.document, ...existing];
        });
      } catch (requestError) {
        const message = getGenerationErrorMessage(
          requestError,
          'Unable to generate the technical spec right now.',
        );

        setGenerationError(message);
        setLimitMessage(isGenerationLimitError(requestError) ? message : null);
      } finally {
        setIsGenerating(false);
      }
    },
    [accessToken, formState, id],
  );

  const handleExportPdf = useCallback(async () => {
    if (!accessToken || !project || !selectedDocument) {
      return;
    }

    setExportError(null);
    setIsExporting(true);

    try {
      const response = await exportProjectDocumentPdfRequest(
        accessToken,
        project.id,
        selectedDocument.id,
      );
      const fallbackFilename = `${slugify(project.name)}-${slugify(selectedDocument.title)}.pdf`;

      downloadBlob(response.blob, response.filename ?? fallbackFilename);
    } catch (requestError) {
      setExportError(
        requestError instanceof ApiError
          ? requestError.message
          : 'Unable to export this document as a PDF.',
      );
    } finally {
      setIsExporting(false);
    }
  }, [accessToken, project, selectedDocument]);

  const handleSelectDocument = useCallback((document: ProjectDocument) => {
    setSelectedDocumentId(document.id);
    const output = getDocumentTechnicalSpec(document);
    setActiveOutput(output);
    setActiveTab('overview');
  }, []);

  const handleFeedbackSaved = useCallback((feedback: ProjectDocumentFeedback) => {
    setDocuments((current) =>
      current.map((document) =>
        document.id === feedback.documentId ? { ...document, feedback } : document,
      ),
    );
  }, []);

  if (isLoading) {
    return <LoadingState label="Loading technical spec writer" />;
  }

  if (loadError || !project) {
    return (
      <div className="space-y-6">
        <PageHeader
          actions={
            <Button onClick={() => navigate(`/projects/${id ?? ''}`)}>Back to project</Button>
          }
          description={loadError ?? 'The technical spec workspace could not be loaded.'}
          eyebrow="Project workspace"
          title="Technical Spec Writer"
        />
        <Card className="border-danger/35 bg-danger/5">
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-muted">
              The workspace may be unavailable, or your account may not have access to the
              project.
            </p>
            <Button onClick={loadWorkspace} variant="secondary">
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => navigate(`/projects/${project.id}`)} variant="secondary">
              Back to project
            </Button>
            {currentMarkdown ? (
              <>
                <Button
                  onClick={async () => {
                    await copyText(currentMarkdown);
                    setCopiedLabel('Full report');
                  }}
                  variant="secondary"
                >
                  Copy spec
                </Button>
                <Button
                  onClick={() =>
                    exportMarkdown(selectedDocument?.title ?? 'technical-spec', currentMarkdown)
                  }
                  variant="secondary"
                >
                  Export markdown
                </Button>
                {selectedDocument?.status === 'COMPLETED' ? (
                  <Button isLoading={isExporting} onClick={handleExportPdf} variant="secondary">
                    Export PDF
                  </Button>
                ) : null}
              </>
            ) : null}
          </div>
        }
        description="Turn a feature request into implementation detail before development starts."
        eyebrow="Project workspace"
        title="Technical Spec Writer"
      />

      {exportError ? (
        <ErrorState
          action={
            <Button onClick={() => setExportError(null)} variant="secondary" size="sm">
              Dismiss
            </Button>
          }
          description="Try again in a moment or contact support if the issue persists."
          title={exportError}
        />
      ) : null}

      {generationError && !limitMessage ? (
        <ErrorState
          action={
            <Button onClick={() => setGenerationError(null)} variant="secondary" size="sm">
              Dismiss
            </Button>
          }
          description="Your form inputs have been preserved. Please check the error details and try again."
          title={generationError}
        />
      ) : null}
      {limitMessage ? <GenerationLimitCallout message={limitMessage} /> : null}

      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Feature inputs</CardTitle>
              <CardDescription>
                Use concrete rules, roles, and examples so the spec reflects the build you actually
                want.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4" onSubmit={handleGenerate}>
                <Input
                  error={formErrors.featureName}
                  hint="Name the feature the same way you would describe it to a developer."
                  label="Feature name"
                  onChange={(event) => updateFormField('featureName', event.target.value)}
                  placeholder="Example: Founder onboarding checklist"
                  value={formState.featureName}
                />
                <Select
                  label="Priority"
                  onChange={(event) =>
                    updateFormField('priority', event.target.value as TechnicalSpecPriority)
                  }
                  value={formState.priority}
                >
                  {priorityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <Textarea
                  error={formErrors.desiredUserOutcome}
                  hint="State who succeeds, what they can do afterward, and what problem is removed."
                  label="Desired user outcome"
                  onChange={(event) => updateFormField('desiredUserOutcome', event.target.value)}
                  placeholder="Example: A founder can complete onboarding without a call and leave with enough context for the workspace to recommend the next build step."
                  value={formState.desiredUserOutcome}
                />
                <Textarea
                  error={formErrors.userRoles}
                  hint="One role per line. Include customers, admins, founders, reviewers, or operators who touch the flow."
                  label="User roles"
                  onChange={(event) => updateFormField('userRoles', event.target.value)}
                  placeholder={'Founder\nProject owner\nWorkspace admin'}
                  value={formState.userRoles}
                />
                <Textarea
                  error={formErrors.businessRules}
                  hint="One rule per line. Include required decisions, limits, eligibility, and approval rules."
                  label="Business rules"
                  onChange={(event) => updateFormField('businessRules', event.target.value)}
                  placeholder={
                    'A founder cannot generate the spec until all required project context is complete.\nSaved specs must remain available in document history for later review.'
                  }
                  value={formState.businessRules}
                />
                <Textarea
                  error={formErrors.constraints}
                  hint="One constraint per line. Include budget, timeline, system, privacy, rollout, or team constraints."
                  label="Constraints"
                  onChange={(event) => updateFormField('constraints', event.target.value)}
                  placeholder={
                    'Must work with the existing authenticated project workspace.\nDo not require a new third-party service for the first release.'
                  }
                  value={formState.constraints}
                />
                <Textarea
                  error={formErrors.examples}
                  hint="One example per line. Use real inputs, outputs, or decisions that should shape the spec."
                  label="Examples"
                  onChange={(event) => updateFormField('examples', event.target.value)}
                  placeholder={
                    'If a founder enters only a feature title, the form should ask for more detail.\nIf a saved spec is opened later, the same structured sections should be available.'
                  }
                  value={formState.examples}
                />
                <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm leading-6 text-muted">
                    Short requests are blocked so the output has enough detail for implementation.
                  </p>
                  <Button isLoading={isGenerating} type="submit">
                    Generate spec
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Project context</CardTitle>
              <CardDescription>Current project details used to anchor the spec.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <DetailBlock label="Project" value={project.name} />
              <DetailBlock
                label="Stage"
                value={getProjectOptionLabel.currentStage(project.currentStage)}
              />
              <DetailBlock
                label="Budget"
                value={getProjectOptionLabel.budgetRange(project.budgetRange)}
              />
              <DetailBlock
                label="Technical level"
                value={getProjectOptionLabel.founderTechnicalLevel(project.founderTechnicalLevel)}
              />
              <DetailBlock label="Target customer" value={project.targetCustomer ?? 'Not set'} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Saved document history</CardTitle>
              <CardDescription>Technical specs generated for this project.</CardDescription>
            </CardHeader>
            <CardContent>
              {historyDocuments.length > 0 ? (
                <div className="grid gap-3">
                  {historyDocuments.map((document) => {
                    const isSelected = document.id === selectedDocumentId;

                    return (
                      <div
                        className={`rounded-md border p-4 transition-colors ${
                          isSelected
                            ? 'border-accent/40 bg-accent/10'
                            : 'border-border bg-surface-raised'
                        }`}
                        key={document.id}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-semibold text-text">{document.title}</h3>
                              <Badge variant={isSelected ? 'accent' : 'neutral'}>
                                {isSelected ? 'Active' : 'Saved'}
                              </Badge>
                            </div>
                            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                              {formatDate(document.createdAt)} at {formatTime(document.createdAt)}
                            </p>
                          </div>
                          <Button
                            onClick={() => handleSelectDocument(document)}
                            size="sm"
                            variant="secondary"
                          >
                            Open
                          </Button>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-muted">
                          {document.summary ?? 'No summary available.'}
                        </p>
                        {document.content ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              onClick={async () => {
                                await copyText(document.content ?? '');
                                setCopiedLabel('Saved spec');
                              }}
                              size="sm"
                              variant="ghost"
                            >
                              Copy
                            </Button>
                            <Button
                              onClick={() => exportMarkdown(document.title, document.content ?? '')}
                              size="sm"
                              variant="ghost"
                            >
                              Export
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  description="A clear technical spec prevents developers from building the wrong thing by locking the outcome, rules, API shape, data changes, edge cases, and tests before work starts."
                  title="No technical specs yet"
                />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {isGenerating ? (
            <Card className="border-accent/30 bg-accent/5">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-text">Generating technical spec</p>
                  <Badge variant="accent">Working</Badge>
                </div>
                <p className="text-sm leading-6 text-muted">{specProgress[progressIndex]}</p>
                <div className="grid gap-2">
                  {specProgress.map((step, index) => (
                    <div
                      className={`rounded-md border px-3 py-2 text-sm leading-6 ${
                        index === progressIndex
                          ? 'border-accent/40 bg-accent/10 text-text'
                          : 'border-border bg-surface-raised text-muted'
                      }`}
                      key={step}
                    >
                      {step}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {copiedLabel ? (
            <div className="flex justify-end">
              <Badge variant="success">{copiedLabel} copied</Badge>
            </div>
          ) : null}

          {currentOutput ? (
            <div className="space-y-5">
              <div className="rounded-lg border border-border bg-surface p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                      Generated spec
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-text">
                      {selectedDocument?.title ?? (formState.featureName || 'Technical Spec')}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-muted">
                      {currentOutput.featureOverview.summary}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <CopyButton
                      label="Full report"
                      onCopied={setCopiedLabel}
                      value={currentOutput.reportMarkdown}
                    />
                    <Button
                      onClick={() =>
                        exportMarkdown(
                          selectedDocument?.title ?? formState.featureName,
                          currentOutput.reportMarkdown,
                        )
                      }
                      size="sm"
                      variant="secondary"
                    >
                      Export markdown
                    </Button>
                  </div>
                </div>
              </div>
              {selectedDocument ? (
                <DocumentFeedbackPanel
                  accessToken={accessToken}
                  document={selectedDocument}
                  onFeedbackSaved={handleFeedbackSaved}
                  projectId={project.id}
                />
              ) : null}
              <Tabs items={tabs} onValueChange={setActiveTab} value={activeTab} />
            </div>
          ) : selectedDocument?.content ? (
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle>{selectedDocument.title}</CardTitle>
                    <CardDescription>
                      {selectedDocument.summary ?? 'Saved technical spec.'}
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={async () => {
                        await copyText(selectedDocument.content ?? '');
                        setCopiedLabel('Saved spec');
                      }}
                      size="sm"
                      variant="secondary"
                    >
                      Copy
                    </Button>
                    <Button
                      onClick={() =>
                        exportMarkdown(selectedDocument.title, selectedDocument.content ?? '')
                      }
                      size="sm"
                      variant="secondary"
                    >
                      Export markdown
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="max-h-[720px] overflow-auto rounded-panel border border-subtle bg-surface-card shadow-sm p-4 whitespace-pre-wrap text-sm leading-6 text-text">
                  {selectedDocument.content}
                </div>
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              description="A clear technical spec prevents developers from building the wrong thing by turning the outcome, rules, edge cases, tests, and handoff sequence into one saved document."
              title="No spec generated yet"
            />
          )}
        </div>
      </div>
    </div>
  );
};
