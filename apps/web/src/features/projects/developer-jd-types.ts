export type DeveloperJdHiringMode =
  | 'freelancer'
  | 'agency'
  | 'co_founder'
  | 'part_time'
  | 'full_time';

export type DeveloperJdLocationPreference =
  | 'no_preference'
  | 'remote_anywhere'
  | 'remote_us'
  | 'timezone_overlap'
  | 'local_preferred';

export type DeveloperJdUrgency = 'urgent' | 'within_30_days' | 'within_60_days' | 'flexible';

export type DeveloperJdGenerationInput = {
  budgetRange: string;
  hiringMode: DeveloperJdHiringMode;
  locationPreference: DeveloperJdLocationPreference;
  urgency: DeveloperJdUrgency;
};

export type DeveloperJdResponsibility = {
  priority: 'must' | 'should' | 'nice';
  responsibility: string;
  whyItMatters: string;
};

export type DeveloperJdSkill = {
  skill: string;
  whyItMatters: string;
};

export type DeveloperJdProjectContext = {
  budgetFit: string;
  hiringScope: string;
  productContext: string;
  stageFit: string;
};

export type DeveloperJdScreeningQuestion = {
  goodAnswerSignals: string[];
  question: string;
};

export type DeveloperJdTakeHomeTask = {
  evaluationFocus: string[];
  expectedDeliverables: string[];
  instructions: string[];
  timeBox: string;
  title: string;
};

export type DeveloperJdRubricItem = {
  concernSignal: string;
  criterion: string;
  strongSignal: string;
  weight: string;
};

export type DeveloperJdRedFlag = {
  redFlag: string;
  whyItMatters: string;
};

export type DeveloperJdPriceTimelineGuidance = {
  assumptions: string[];
  priceGuidance: string;
  timelineGuidance: string;
};

export type DeveloperJdTechnicalRequirement = {
  category: string;
  requirements: string[];
  whyItMatters: string;
};

export type DeveloperJdOutput = {
  employmentType: 'contractor' | 'fractional' | 'full_time' | 'agency' | 'mixed';
  evaluationRubric: DeveloperJdRubricItem[];
  jobPost: string;
  moduleType: 'developer_job_description';
  niceToHaveSkills: DeveloperJdSkill[];
  priceTimelineGuidance: DeveloperJdPriceTimelineGuidance;
  projectContext: DeveloperJdProjectContext;
  redFlags: DeveloperJdRedFlag[];
  reportMarkdown: string;
  requiredSkills: DeveloperJdSkill[];
  responsibilities: DeveloperJdResponsibility[];
  recommendation: string;
  roleSummary: string;
  roleTitle: string;
  screeningQuestions: DeveloperJdScreeningQuestion[];
  seniorityRecommendation: string;
  takeHomeTask: DeveloperJdTakeHomeTask;
  technicalRequirements: DeveloperJdTechnicalRequirement[];
};

export type DeveloperJdDocumentMetadata = {
  developerJobDescription?: unknown;
  request?: DeveloperJdGenerationInput;
};
