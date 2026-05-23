export type TechnicalSpecPriority = 'low' | 'medium' | 'high' | 'critical';

export type TechnicalSpecGenerationInput = {
  constraints: string[];
  existingSystemNotes: string[];
  featureDescription: string;
  featureName: string;
  priority: TechnicalSpecPriority;
};

export type TechnicalSpecFeatureOverview = {
  goal: string;
  priorityRationale: string;
  problem: string;
  summary: string;
};

export type TechnicalSpecUserStory = {
  actor: string;
  benefit: string;
  goal: string;
  story: string;
};

export type TechnicalSpecUserFlow = {
  actor: string;
  failureHandling: string;
  steps: string[];
  successOutcome: string;
  title: string;
};

export type TechnicalSpecApiEndpoint = {
  auth: string;
  errorStates: string[];
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  purpose: string;
  requestBody: string[];
  requestExample: string;
  responseBody: string[];
  responseExample: string;
};

export type TechnicalSpecDatabaseChange = {
  changeType: 'create' | 'update' | 'delete' | 'none';
  entity: string;
  fields: string[];
  migrationNotes: string;
  relationships: string[];
};

export type TechnicalSpecPermission = {
  accessLevel: 'none' | 'read' | 'write' | 'owner' | 'admin';
  actor: string;
  enforcement: string;
  requirement: string;
};

export type TechnicalSpecEdgeCase = {
  case: string;
  expectedBehavior: string;
  handling: string;
};

export type TechnicalSpecErrorState = {
  condition: string;
  message: string;
  recovery: string;
  statusCode?: string | null;
};

export type TechnicalSpecAnalyticsEvent = {
  eventName: string;
  properties: string[];
  purpose: string;
  trigger: string;
};

export type TechnicalSpecAcceptanceCriterion = {
  criterion: string;
  verification: string;
};

export type TechnicalSpecTestCase = {
  expectedResult: string;
  scenario: string;
  steps: string[];
  testType: 'unit' | 'integration' | 'end_to_end' | 'manual';
};

export type TechnicalSpecImplementationStep = {
  dependencies: string[];
  order: number;
  title: string;
  verification: string;
  work: string;
};

export type TechnicalSpecAssumption = {
  reason: string;
  text: string;
};

export type TechnicalSpecOutput = {
  acceptanceCriteria: TechnicalSpecAcceptanceCriterion[];
  analyticsEvents: TechnicalSpecAnalyticsEvent[];
  apiEndpoints: TechnicalSpecApiEndpoint[];
  assumptions: TechnicalSpecAssumption[];
  databaseChanges: TechnicalSpecDatabaseChange[];
  edgeCases: TechnicalSpecEdgeCase[];
  errorStates: TechnicalSpecErrorState[];
  featureOverview: TechnicalSpecFeatureOverview;
  implementationSequence: TechnicalSpecImplementationStep[];
  moduleType: 'TECH_SPEC';
  outOfScope: string[];
  permissions: TechnicalSpecPermission[];
  reportMarkdown: string;
  testCases: TechnicalSpecTestCase[];
  userFlows: TechnicalSpecUserFlow[];
  userStories: TechnicalSpecUserStory[];
};

export type TechnicalSpecDocumentMetadata = {
  request?: TechnicalSpecGenerationInput;
  technicalSpec?: unknown;
};
