export type ProjectPromptAnswer = {
  answer: unknown;
  key: string;
  label?: string | null;
};

export type ProjectPromptContext = {
  answers?: ProjectPromptAnswer[];
  biggestConcern?: string | null;
  budgetRange?: string | null;
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
  targetCustomer?: string | null;
};

const formatUnknownValue = (value: unknown): string => {
  if (Array.isArray(value)) {
    return value.map(formatUnknownValue).filter(Boolean).join(', ');
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (value && typeof value === 'object') {
    return JSON.stringify(value);
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
  addLine(lines, 'Launch timeline', project.launchTimeline);
  addLine(lines, 'Founder technical level', project.founderTechnicalLevel);
  addLine(lines, 'Existing assets', project.existingAssets);
  addLine(lines, 'Must-have features', project.mustHaveFeatures);
  addLine(lines, 'Biggest concern', project.biggestConcern);

  if (project.answers?.length) {
    lines.push('Saved founder answers:');

    project.answers.forEach((answer) => {
      addLine(lines, answer.label ?? answer.key, answer.answer);
    });
  }

  return lines.join('\n');
};
