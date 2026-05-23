export type RateValidatorDeveloperType = 'freelancer' | 'agency' | 'unknown';
export type RateValidatorUrgency = 'urgent' | 'within_30_days' | 'within_60_days' | 'flexible';
export type RateValidatorConfidence = 'low' | 'medium' | 'high';
export type RateValidatorVerdict =
  | 'fair'
  | 'risky'
  | 'overpriced'
  | 'under_scoped'
  | 'unrealistic';

export type RateValidatorGenerationInput = {
  countryMarket: string | null;
  currency: string | null;
  deadline: string | null;
  developerType: RateValidatorDeveloperType;
  projectUrgency: RateValidatorUrgency;
  proposalText: string;
};

export type RateValidatorParsedScopeItem = {
  complexity: 'low' | 'medium' | 'high';
  confidenceLevel: RateValidatorConfidence;
  description: string;
  pricingConcern: string;
  scopeItem: string;
  specificity: 'specific' | 'partial' | 'vague';
};

export type RateValidatorQuotedPrice = {
  amount: number | null;
  basis: 'fixed_bid' | 'hourly' | 'monthly' | 'milestone' | 'unclear';
  currency: string | null;
  notes: string;
};

export type RateValidatorComplexity = {
  confidenceLevel: RateValidatorConfidence;
  drivers: string[];
  level: 'low' | 'medium' | 'high' | 'very_high';
  rationale: string;
};

export type RateValidatorTimeline = {
  confidenceLevel: RateValidatorConfidence;
  concerns: string[];
  rationale: string;
  verdict: 'realistic' | 'aggressive' | 'unrealistic' | 'unclear';
};

export type RateValidatorPriceFairness = {
  confidenceLevel: RateValidatorConfidence;
  rationale: string;
  verdict: RateValidatorVerdict;
};

export type RateValidatorPricingRisk = {
  confidenceLevel: RateValidatorConfidence;
  rationale: string;
  riskLevel: 'low' | 'medium' | 'high';
};

export type RateValidatorMissingDeliverable = {
  deliverable: string;
  whyItMatters: string;
};

export type RateValidatorContractGap = {
  gap: string;
  risk: string;
};

export type RateValidatorQuestion = {
  question: string;
  reason: string;
};

export type RateValidatorOutput = {
  dangerousContractGaps: RateValidatorContractGap[];
  estimatedComplexity: RateValidatorComplexity;
  missingDeliverables: RateValidatorMissingDeliverable[];
  moduleType: 'quote_analysis';
  negotiationScript: string;
  overchargeRisk: RateValidatorPricingRisk;
  parsedScopeItems: RateValidatorParsedScopeItem[];
  priceFairnessVerdict: RateValidatorPriceFairness;
  questionsToAskDeveloper: RateValidatorQuestion[];
  quotedPrice: RateValidatorQuotedPrice;
  recommendation: string;
  reportMarkdown: string;
  riskScore: number;
  timelineRealism: RateValidatorTimeline;
  totalRiskLevel: 'low' | 'medium' | 'high' | 'critical';
  underchargeRisk: RateValidatorPricingRisk;
  vagueScopeFlags: string[];
  valueJudgment: string;
  vendorSummary: string;
};

export type RateValidatorDocumentMetadata = {
  quoteAnalysis?: unknown;
  request?: RateValidatorGenerationInput;
};
