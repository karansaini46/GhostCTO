import { buildProjectContextSection, type ProjectPromptContext } from './project-context.js';

const safetyBoundaries = [
  'Use only the provided project context for project-specific claims.',
  'State assumptions when context is missing or incomplete.',
  'Do not invent vendors, credentials, citations, metrics, implementation status, or pricing certainty.',
  'Do not provide legal, tax, medical, investment, or security guarantees.',
  'Keep the guidance practical for a non-technical founder making product and hiring decisions.',
];

const textOutputRequirements = [
  'Use concise, direct language.',
  'Separate clear recommendations from assumptions.',
  'Prefer actionable next steps over broad explanation.',
];

const structuredOutputRequirements = [
  'Return valid JSON only.',
  'Return exactly one JSON object at the top level, not an array.',
  'Do not wrap JSON in Markdown fences.',
  'Do not include commentary before or after the JSON value.',
  'Use null for unknown optional values.',
  'Use arrays for list fields, even when the list has one item.',
  "Use single quotes (') for any nested quotes, code blocks, or HTML/markdown attributes inside JSON string values.",
];

type BuildPromptInput = {
  project: ProjectPromptContext;
  requirements?: string[];
  task: string;
};

type BuildStructuredPromptInput = BuildPromptInput & {
  schemaDescription?: string;
  schemaName: string;
};

const formatList = (title: string, items: string[]) =>
  [title, ...items.map((item) => `- ${item}`)].join('\n');

export const buildTextPrompt = ({ project, requirements = [], task }: BuildPromptInput) =>
  [
    buildProjectContextSection(project),
    '',
    formatList('Safety boundaries:', safetyBoundaries),
    '',
    formatList('Output requirements:', [...textOutputRequirements, ...requirements]),
    '',
    'Task:',
    task,
  ].join('\n');

export const buildStructuredPrompt = ({
  project,
  requirements = [],
  schemaDescription,
  schemaName,
  task,
}: BuildStructuredPromptInput) =>
  [
    buildProjectContextSection(project),
    '',
    formatList('Safety boundaries:', safetyBoundaries),
    '',
    formatList('Strict JSON requirements:', [...structuredOutputRequirements, ...requirements]),
    '',
    `Schema target: ${schemaName}`,
    schemaDescription ? `Schema details: ${schemaDescription}` : undefined,
    '',
    'Task:',
    task,
  ]
    .filter((part): part is string => typeof part === 'string')
    .join('\n');

export const buildStructuredRetryPrompt = ({
  originalPrompt,
  previousText,
  validationSummary,
}: {
  originalPrompt: string;
  previousText: string;
  validationSummary: string;
}) =>
  [
    originalPrompt,
    '',
    'The previous response could not be accepted.',
    `Validation issues: ${validationSummary}`,
    '',
    'Previous response:',
    previousText,
    '',
    formatList(
      'Return a corrected response that follows these rules:',
      structuredOutputRequirements,
    ),
  ].join('\n');
