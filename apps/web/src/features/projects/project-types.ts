export type ProjectPayload = {
  biggestConcern: string;
  budgetRange: string;
  currentStage: string;
  existingAssets: string[];
  founderTechnicalLevel: string;
  ideaSummary: string;
  industry: string;
  launchTimeline: string;
  monetization: string;
  mustHaveFeatures: string[];
  name: string;
  productType: string;
  targetCustomer: string;
};

export type ProjectAnswer = {
  answer: unknown;
  createdAt: string;
  id: string;
  key: string;
  label: string | null;
  metadata: unknown;
  type: string;
  updatedAt: string;
};

export type ProjectDocument = {
  completedAt: string | null;
  createdAt: string;
  content: string | null;
  id: string;
  metadata: unknown;
  status: string;
  summary: string | null;
  title: string;
  type: string;
  updatedAt: string;
};

export type Project = {
  answers: ProjectAnswer[];
  biggestConcern: string | null;
  budgetRange: string | null;
  createdAt: string;
  currentStage: string | null;
  documents: ProjectDocument[];
  existingAssets: string[];
  founderTechnicalLevel: string | null;
  id: string;
  ideaSummary: string | null;
  industry: string | null;
  launchTimeline: string | null;
  monetization: string | null;
  mustHaveFeatures: string[];
  name: string;
  productType: string | null;
  slug: string;
  status: string;
  targetCustomer: string | null;
  updatedAt: string;
};

export type StackAdviceGenerationOverrides = {
  budgetRange?: string;
  complianceSensitivity?: string;
  founderTechnicalLevel?: string;
  speedPriority?: string;
  targetScale?: string;
};

export type ProjectDocumentType = 'roadmap' | 'stack_advisor' | 'technical_spec';
