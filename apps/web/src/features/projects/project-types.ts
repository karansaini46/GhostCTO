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
  feedback: ProjectDocumentFeedback | null;
  id: string;
  metadata: unknown;
  projectId: string | null;
  status: string;
  summary: string | null;
  title: string;
  type: string;
  updatedAt: string;
  version: number;
};

export type ProjectDocumentFeedbackUsefulness = 'USEFUL' | 'NEEDS_WORK' | 'WRONG';

export type ProjectDocumentFeedbackIssueType =
  | 'MISSING_CONTEXT'
  | 'INCORRECT_CONTENT'
  | 'TOO_GENERIC'
  | 'MISSING_DETAIL'
  | 'HARD_TO_ACT_ON'
  | 'OTHER';

export type ProjectDocumentFeedback = {
  comment: string | null;
  createdAt: string;
  documentId: string;
  documentType: string;
  id: string;
  issueType: ProjectDocumentFeedbackIssueType | null;
  projectId: string;
  rating: number;
  updatedAt: string;
  usefulness: ProjectDocumentFeedbackUsefulness;
};

export type ProjectDocumentFeedbackPayload = {
  comment?: string | null;
  issueType?: ProjectDocumentFeedbackIssueType | null;
  usefulness: ProjectDocumentFeedbackUsefulness;
};

export type ProjectChatMessageRole = 'founder' | 'advisor' | 'system';

export type ProjectChatMessage = {
  content: string;
  createdAt: string;
  id: string;
  metadata: unknown;
  projectId: string | null;
  role: ProjectChatMessageRole;
  updatedAt: string;
};

export type ProjectChatPagination = {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  limit: number;
  page: number;
  total: number;
  totalPages: number;
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

export type ProjectDocumentType =
  | 'code_audit'
  | 'developer_jd'
  | 'roadmap'
  | 'stack_advisor'
  | 'technical_spec'
  | 'rate_validator'
  | 'vetting_scorecard';

export type ExtractionResult = {
  ideaSummary: string | null;
  targetCustomer: string | null;
  industry: string | null;
  productType: string | null;
  monetization: string | null;
  currentStage: string | null;
  mustHaveFeatures: string[] | null;
};

export type ExtractionResponse = {
  result: ExtractionResult;
};

