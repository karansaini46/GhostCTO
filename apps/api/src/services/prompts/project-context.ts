export type ProjectPromptAnswer = {
  answer: unknown;
  key: string;
  label?: string | null;
};

export type ProjectPromptContext = {
  answers?: ProjectPromptAnswer[];
  biggestConcern?: string | null;
  budgetRange?: string | null;
  complianceSensitivity?: string | null;
  currentStage?: string | null;
  existingAssets?: string[] | null;
  founderTechnicalLevel?: string | null;
  ideaSummary?: string | null;
  industry?: string | null;
  launchTimeline?: string | null;
  monetization?: string | null;
  mustHaveFeatures?: string[] | null;
  name: string;
  productType?: string | null;
  speedPriority?: string | null;
  targetCustomer?: string | null;
  targetScale?: string | null;
};

const maxValueLength = 1200;
const maxArrayItemLength = 300;
const maxArrayItems = 12;
const maxAnswers = 30;

const compactText = (value: string) => value.replace(/\s+/g, ' ').trim();

const truncateText = (value: string, maxLength: number) => {
  const compacted = compactText(value);

  if (compacted.length <= maxLength) {
    return compacted;
  }

  return `${compacted.slice(0, maxLength - 1).trim()}...`;
};

const formatUnknownValue = (value: unknown): string => {
  if (Array.isArray(value)) {
    return value
      .slice(0, maxArrayItems)
      .map((item) => truncateText(formatUnknownValue(item), maxArrayItemLength))
      .filter(Boolean)
      .join(', ');
  }

  if (typeof value === 'string') {
    return truncateText(value, maxValueLength);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (value && typeof value === 'object') {
    return truncateText(JSON.stringify(value), maxValueLength);
  }

  return '';
};

const addLine = (lines: string[], label: string, value: unknown) => {
  const formattedValue = formatUnknownValue(value);

  if (formattedValue) {
    lines.push(`- ${label}: ${formattedValue}`);
  }
};

export const buildProjectContextSection = (project: ProjectPromptContext) => {
  const lines = ['Project context:', `- Project name: ${project.name}`];

  addLine(lines, 'Idea summary', project.ideaSummary);
  addLine(lines, 'Target customer', project.targetCustomer);
  addLine(lines, 'Industry', project.industry);
  addLine(lines, 'Product type', project.productType);
  addLine(lines, 'Monetization', project.monetization);
  addLine(lines, 'Current stage', project.currentStage);
  addLine(lines, 'Budget range', project.budgetRange);
  addLine(lines, 'Target scale', project.targetScale);
  addLine(lines, 'Compliance sensitivity', project.complianceSensitivity);
  addLine(lines, 'Speed priority', project.speedPriority);
  addLine(lines, 'Launch timeline', project.launchTimeline);
  addLine(lines, 'Founder technical level', project.founderTechnicalLevel);
  addLine(lines, 'Existing assets', project.existingAssets);
  addLine(lines, 'Must-have features', project.mustHaveFeatures);
  addLine(lines, 'Biggest concern', project.biggestConcern);

  if (project.answers?.length) {
    lines.push('Saved founder answers:');

    project.answers.slice(0, maxAnswers).forEach((answer) => {
      addLine(lines, answer.label ?? answer.key, answer.answer);
    });
  }

  return lines.join('\n');
};
