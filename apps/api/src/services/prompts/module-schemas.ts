import { z } from 'zod';

const nonEmptyText = (label: string, maxLength = 240) =>
  z.string().trim().min(1, `${label} is required.`).max(maxLength, `${label} is too long.`);

export const ghostctoModuleTypes = [
  'roadmap',
  'tech_stack_recommendation',
  'developer_job_description',
  'technical_specification',
  'quote_analysis',
  'code_audit',
  'vetting_scorecard',
] as const;

export type GhostCTOModuleType = (typeof ghostctoModuleTypes)[number];

export const reportCardSchema = z
  .object({
    detail: z.string().trim().min(1).max(360).optional().nullable(),
    title: nonEmptyText('Card title', 80),
    tone: z.enum(['neutral', 'positive', 'warning', 'danger', 'accent']),
    value: nonEmptyText('Card value', 180),
  })
  .strict();

export const assumptionSchema = z
  .object({
    reason: z.string().trim().min(1).max(280).optional().nullable(),
    text: nonEmptyText('Assumption', 240),
  })
  .strict();

export const riskSchema = z
  .object({
    impact: nonEmptyText('Risk impact', 240),
    mitigation: nonEmptyText('Risk mitigation', 280),
    risk: nonEmptyText('Risk', 240),
  })
  .strict();

export const nextStepSchema = z
  .object({
    action: nonEmptyText('Next step', 240),
    reason: z.string().trim().min(1).max(280).optional().nullable(),
  })
  .strict();

const baseModuleOutputSchema = z
  .object({
    assumptions: z.array(assumptionSchema).min(1).max(6),
    cards: z.array(reportCardSchema).min(2).max(8),
    nextSteps: z.array(nextStepSchema).min(2).max(8),
    reportMarkdown: z.string().trim().min(1).max(30000),
    risks: z.array(riskSchema).min(1).max(6),
  })
  .strict();

const roadmapMilestoneSchema = z
  .object({
    dependencies: z.array(nonEmptyText('Milestone dependency', 120)).max(5),
    deliverables: z.array(nonEmptyText('Milestone deliverable', 140)).min(1).max(5),
    objective: nonEmptyText('Milestone objective', 180),
    owner: nonEmptyText('Milestone owner', 80),
    phase: nonEmptyText('Milestone phase', 80),
    targetWindow: nonEmptyText('Milestone target window', 120),
  })
  .strict();

const stackLayerSchema = z
  .object({
    decision: nonEmptyText('Stack decision', 160),
    layer: z.enum([
      'frontend',
      'backend',
      'database',
      'auth',
      'hosting',
      'payments',
      'analytics',
      'automation',
      'testing',
      'search',
      'model_services',
    ]),
    rationale: nonEmptyText('Stack rationale', 280),
    tradeoffs: z.array(nonEmptyText('Stack tradeoff', 180)).max(4),
  })
  .strict();

const jobResponsibilitySchema = z
  .object({
    priority: z.enum(['must', 'should', 'nice']),
    responsibility: nonEmptyText('Responsibility', 200),
    whyItMatters: nonEmptyText('Responsibility rationale', 240),
  })
  .strict();

const skillSchema = z
  .object({
    importance: z.enum(['must_have', 'nice_to_have']),
    skill: nonEmptyText('Skill', 180),
    whyItMatters: nonEmptyText('Skill rationale', 240),
  })
  .strict();

const interviewQuestionSchema = z
  .object({
    goodAnswerSignals: z.array(nonEmptyText('Good answer signal', 180)).max(4),
    question: nonEmptyText('Interview question', 220),
  })
  .strict();

const specificationSectionSchema = z
  .object({
    decision: nonEmptyText('Specification decision', 180),
    explanation: nonEmptyText('Specification explanation', 260),
    title: nonEmptyText('Specification section title', 120),
  })
  .strict();

const componentSchema = z
  .object({
    dependencies: z.array(nonEmptyText('Component dependency', 120)).max(6),
    inputs: z.array(nonEmptyText('Component input', 160)).min(1).max(6),
    name: nonEmptyText('Component name', 120),
    outputs: z.array(nonEmptyText('Component output', 160)).min(1).max(6),
    purpose: nonEmptyText('Component purpose', 240),
  })
  .strict();

const apiEndpointSchema = z
  .object({
    auth: nonEmptyText('API auth requirement', 120),
    method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
    path: nonEmptyText('API path', 160),
    purpose: nonEmptyText('API purpose', 220),
    requestShape: z.array(nonEmptyText('Request field', 160)).max(8),
    responseShape: z.array(nonEmptyText('Response field', 160)).max(8),
  })
  .strict();

const dataEntitySchema = z
  .object({
    fields: z.array(nonEmptyText('Data field', 160)).min(1).max(10),
    name: nonEmptyText('Data entity name', 120),
    notes: nonEmptyText('Data entity notes', 240),
  })
  .strict();

const acceptanceCriterionSchema = z
  .object({
    criterion: nonEmptyText('Acceptance criterion', 220),
    howToVerify: nonEmptyText('Verification step', 220),
  })
  .strict();

const quoteLineItemSchema = z
  .object({
    amount: nonEmptyText('Quote amount', 80),
    comment: nonEmptyText('Quote comment', 240),
    concernLevel: z.enum(['low', 'medium', 'high']),
    item: nonEmptyText('Quote line item', 220),
    judgment: z.enum(['accept', 'clarify', 'push_back']),
  })
  .strict();

const auditFindingSchema = z
  .object({
    evidence: nonEmptyText('Finding evidence', 280),
    fix: nonEmptyText('Finding fix', 260),
    impact: nonEmptyText('Finding impact', 240),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    title: nonEmptyText('Finding title', 180),
  })
  .strict();

const scorecardCriterionSchema = z
  .object({
    criterion: nonEmptyText('Scorecard criterion', 200),
    notes: nonEmptyText('Scorecard notes', 260),
    score: z.number().int().min(1).max(5),
  })
  .strict();

export const roadmapOutputSchema = baseModuleOutputSchema.extend({
  decisionLog: z.array(nonEmptyText('Roadmap decision log entry', 240)).min(2).max(8),
  milestones: z.array(roadmapMilestoneSchema).min(3).max(8),
  moduleType: z.literal('roadmap'),
  recommendation: nonEmptyText('Roadmap recommendation', 320),
});

export const techStackRecommendationSchema = baseModuleOutputSchema.extend({
  moduleType: z.literal('tech_stack_recommendation'),
  recommendation: nonEmptyText('Stack recommendation', 320),
  rejectedOptions: z
    .array(
      z
        .object({
          reason: nonEmptyText('Rejected option reason', 240),
          option: nonEmptyText('Rejected option', 180),
        })
        .strict(),
    )
    .min(2)
    .max(8),
  stack: z.array(stackLayerSchema).min(5).max(10),
});

export const developerJobDescriptionSchema = baseModuleOutputSchema.extend({
  interviewQuestions: z.array(interviewQuestionSchema).min(5).max(10),
  mustHaveSkills: z.array(skillSchema).min(4).max(12),
  moduleType: z.literal('developer_job_description'),
  roleSummary: nonEmptyText('Role summary', 320),
  responsibilities: z.array(jobResponsibilitySchema).min(4).max(10),
  recommendation: nonEmptyText('Job description recommendation', 320),
  niceToHaveSkills: z.array(skillSchema).min(3).max(10),
});

export const technicalSpecificationSchema = baseModuleOutputSchema.extend({
  acceptanceCriteria: z.array(acceptanceCriterionSchema).min(4).max(12),
  components: z.array(componentSchema).min(3).max(12),
  dataModel: z.array(dataEntitySchema).min(2).max(12),
  implementationPhases: z.array(specificationSectionSchema).min(3).max(8),
  moduleType: z.literal('technical_specification'),
  nonGoals: z.array(nonEmptyText('Non-goal', 200)).min(2).max(10),
  recommendation: nonEmptyText('Specification recommendation', 320),
  apiEndpoints: z.array(apiEndpointSchema).min(1).max(12),
});

export const quoteAnalysisSchema = baseModuleOutputSchema.extend({
  clarifyingQuestions: z.array(nonEmptyText('Clarifying question', 220)).min(2).max(8),
  lineItems: z.array(quoteLineItemSchema).min(1).max(12),
  moduleType: z.literal('quote_analysis'),
  recommendation: nonEmptyText('Quote analysis recommendation', 320),
  scopeGaps: z.array(nonEmptyText('Scope gap', 220)).min(1).max(10),
  totalRiskLevel: z.enum(['low', 'medium', 'high', 'critical']),
  vendorSummary: nonEmptyText('Vendor summary', 280),
  valueJudgment: nonEmptyText('Value judgment', 320),
});

export const codeAuditSchema = baseModuleOutputSchema.extend({
  findings: z.array(auditFindingSchema).min(1).max(12),
  moduleType: z.literal('code_audit'),
  maintainabilityNotes: z.array(nonEmptyText('Maintainability note', 220)).min(2).max(8),
  overallAssessment: nonEmptyText('Overall assessment', 320),
  recommendation: nonEmptyText('Code audit recommendation', 320),
  remediationPlan: z.array(nonEmptyText('Remediation plan item', 240)).min(3).max(10),
  securityNotes: z.array(nonEmptyText('Security note', 220)).min(1).max(8),
  severitySummary: z.enum(['low', 'medium', 'high', 'critical']),
  quickWins: z.array(nonEmptyText('Quick win', 200)).min(2).max(8),
});

export const vettingScorecardSchema = baseModuleOutputSchema.extend({
  concernSummary: nonEmptyText('Concern summary', 320),
  criteria: z.array(scorecardCriterionSchema).min(5).max(12),
  followUpQuestions: z.array(nonEmptyText('Follow-up question', 220)).min(2).max(10),
  moduleType: z.literal('vetting_scorecard'),
  overallScore: z.number().int().min(1).max(100),
  recommendation: nonEmptyText('Scorecard recommendation', 320),
  strengths: z.array(nonEmptyText('Strength', 220)).min(2).max(10),
  verdict: z.enum(['proceed', 'proceed_with_caution', 'hold', 'reject']),
});

export type RoadmapOutput = z.infer<typeof roadmapOutputSchema>;
export type TechStackRecommendationOutput = z.infer<typeof techStackRecommendationSchema>;
export type DeveloperJobDescriptionOutput = z.infer<typeof developerJobDescriptionSchema>;
export type TechnicalSpecificationOutput = z.infer<typeof technicalSpecificationSchema>;
export type QuoteAnalysisOutput = z.infer<typeof quoteAnalysisSchema>;
export type CodeAuditOutput = z.infer<typeof codeAuditSchema>;
export type VettingScorecardOutput = z.infer<typeof vettingScorecardSchema>;
