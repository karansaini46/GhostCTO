export type StackAdviceCategoryKey = string;

export type StackAdviceCard = {
  detail?: string | null;
  title: string;
  tone: 'neutral' | 'positive' | 'warning' | 'danger' | 'accent';
  value: string;
};

export type StackAdviceAssumption = {
  reason?: string | null;
  text: string;
};

export type StackAdviceRisk = {
  impact: string;
  mitigation: string;
  risk: string;
};

export type StackAdviceNextStep = {
  action: string;
  reason?: string | null;
};

export type StackAdviceCategory = {
  category: StackAdviceCategoryKey;
  commonAlternative: string;
  costRisk: string;
  costRiskLevel: 'low' | 'medium' | 'high';
  founderExplanation: string;
  operationalComplexity: string;
  operationalComplexityLevel: 'low' | 'medium' | 'high';
  recommendation: string;
  whyItFits: string;
  whyNotCommonAlternative: string;
};

export type StackAdviceOutput = {
  assumptions: StackAdviceAssumption[];
  cards: StackAdviceCard[];
  categories: StackAdviceCategory[];
  executiveSummary: string;
  moduleType: 'STACK_ADVICE';
  nextSteps: StackAdviceNextStep[];
  recommendation: string;
  reportMarkdown: string;
  risks: StackAdviceRisk[];
  scaleView: string;
  teamAssumption: string;
};

export type StackAdviceDocumentMetadata = {
  constraints?: {
    budgetRange?: string;
    complianceSensitivity?: string;
    founderTechnicalLevel?: string;
    speedPriority?: string;
    targetScale?: string;
  };
  requestOverrides?: {
    budgetRange?: string;
    complianceSensitivity?: string;
    founderTechnicalLevel?: string;
    speedPriority?: string;
    targetScale?: string;
  };
  stackAdvice?: StackAdviceOutput;
};

export const stackAdviceLayerLabels: Record<string, string> = {
  analytics: 'Analytics',
  auth: 'Authentication',
  backend: 'Backend',
  database: 'Database',
  email: 'Email',
  file_storage: 'File storage',
  frontend: 'Frontend',
  hosting: 'Deployment',
  monitoring: 'Monitoring',
  payments: 'Payments',
};
