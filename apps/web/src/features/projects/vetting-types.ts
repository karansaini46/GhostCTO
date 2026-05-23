export type VettingRecommendation = 'avoid' | 'hire' | 'interview_with_caution' | 'need_more_info';

export type VettingGenerationInput = {
  founderConcern: string;
  portfolioText: string;
  proposalText: string;
  subjectName: string;
  websiteUrl: string | null;
};

export type VettingFlag = {
  evidence: string;
  item: string;
  whyItMatters: string;
};

export type VettingQuestion = {
  question: string;
  reason: string;
  strongAnswerSignals: string[];
};

export type VettingCriterion = {
  criterion: string;
  notes: string;
  score: number;
};

export type VettingScoreSection = {
  reasoning: string;
  score: number;
};

export type VettingNextStep = {
  action: string;
  reason?: string | null;
};

export type VettingRisk = {
  impact: string;
  mitigation: string;
  risk: string;
};

export type VettingOutput = {
  concernSummary: string;
  criteria: VettingCriterion[];
  finalRecommendation: VettingRecommendation;
  greenFlags: VettingFlag[];
  interviewQuestions: VettingQuestion[];
  missingProof: VettingFlag[];
  moduleType: 'vetting_scorecard';
  nextSteps: VettingNextStep[];
  overallScore: number;
  overallScoreReasoning: string;
  portfolioProofScore: VettingScoreSection;
  pricingRiskScore: VettingScoreSection;
  recommendation: string;
  redFlags: VettingFlag[];
  reportMarkdown: string;
  risks: VettingRisk[];
  strengths: string[];
  technicalDepthScore: VettingScoreSection;
  communicationClarityScore: VettingScoreSection;
};

export type VettingDocumentMetadata = {
  request?: VettingGenerationInput;
  vettingScorecard?: unknown;
};
