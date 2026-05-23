import { z } from 'zod';

const nonEmptyText = (label: string, maxLength = 240) =>
  z.string().trim().min(1, `${label} is required.`).max(maxLength, `${label} is too long.`);

export const ghostctoModuleTypes = [
  'roadmap',
  'stack_advice',
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

const roadmapPhaseSchema = z
  .object({
    boundary: nonEmptyText('Phase boundary', 260),
    dependencies: z.array(nonEmptyText('Phase dependency', 180)).min(1).max(8),
    deliverables: z.array(nonEmptyText('Phase deliverable', 180)).min(1).max(8),
    durationWeeks: z.string().trim().min(1).max(80),
    exitCriteria: z.array(nonEmptyText('Phase exit criteria', 180)).min(1).max(8),
    goals: z.array(nonEmptyText('Phase goal', 180)).min(1).max(8),
    scope: z.array(nonEmptyText('Phase scope item', 180)).min(1).max(12),
    title: nonEmptyText('Phase title', 80),
  })
  .strict();

const roadmapFeatureRowSchema = z
  .object({
    decision: z.enum(['in_scope', 'defer', 'exclude']),
    feature: nonEmptyText('Feature name', 180),
    note: nonEmptyText('Feature note', 280),
    phase: z.enum(['phase_1_mvp', 'phase_2_growth', 'phase_3_scale']),
  })
  .strict();

const roadmapTimelineEstimateSchema = z
  .object({
    assumptions: z.array(nonEmptyText('Timeline assumption', 200)).min(1).max(8),
    totalWeeks: nonEmptyText('Total timeline estimate', 120),
    phase1Weeks: nonEmptyText('Phase 1 timeline estimate', 120),
    phase2Weeks: nonEmptyText('Phase 2 timeline estimate', 120),
    phase3Weeks: nonEmptyText('Phase 3 timeline estimate', 120),
  })
  .strict();

const roadmapDependencySchema = z
  .object({
    dependency: nonEmptyText('Technical dependency', 180),
    impact: nonEmptyText('Dependency impact', 240),
    riskIfMissing: nonEmptyText('Dependency risk', 240),
  })
  .strict();

const roadmapRiskSchema = z
  .object({
    impact: nonEmptyText('Roadmap risk impact', 240),
    likelihood: z.enum(['low', 'medium', 'high']),
    mitigation: nonEmptyText('Roadmap risk mitigation', 280),
    risk: nonEmptyText('Roadmap risk', 240),
  })
  .strict();

const roadmapCostControlSchema = z
  .object({
    advice: nonEmptyText('Cost-control advice', 260),
    reason: nonEmptyText('Cost-control reason', 260),
  })
  .strict();

const roadmapHandoffChecklistItemSchema = z
  .object({
    item: nonEmptyText('Handoff checklist item', 220),
    reason: nonEmptyText('Handoff checklist reason', 260),
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

const stackAdviceCategorySchema = z
  .object({
    category: z.enum([
      'frontend',
      'backend',
      'database',
      'auth',
      'hosting',
      'payments',
      'analytics',
      'email',
      'file_storage',
      'monitoring',
      'ai_tools',
    ]),
    commonAlternative: nonEmptyText('Common alternative', 180),
    costRisk: nonEmptyText('Cost risk', 260),
    costRiskLevel: z.enum(['low', 'medium', 'high']),
    founderExplanation: nonEmptyText('Founder explanation', 280),
    operationalComplexity: nonEmptyText('Operational complexity', 260),
    operationalComplexityLevel: z.enum(['low', 'medium', 'high']),
    recommendation: nonEmptyText('Stack recommendation', 220),
    whyItFits: nonEmptyText('Why it fits', 280),
    whyNotCommonAlternative: nonEmptyText('Why not the common alternative', 280),
  })
  .strict();

const jobResponsibilitySchema = z
  .object({
    priority: z.enum(['must', 'should', 'nice']),
    responsibility: nonEmptyText('Responsibility', 200),
    whyItMatters: nonEmptyText('Responsibility rationale', 240),
  })
  .strict();

const interviewQuestionSchema = z
  .object({
    goodAnswerSignals: z.array(nonEmptyText('Good answer signal', 180)).max(4),
    question: nonEmptyText('Interview question', 220),
  })
  .strict();

const developerJobProjectContextSchema = z
  .object({
    budgetFit: nonEmptyText('Budget fit', 280),
    hiringScope: nonEmptyText('Hiring scope', 320),
    productContext: nonEmptyText('Product context', 420),
    stageFit: nonEmptyText('Stage fit', 280),
  })
  .strict();

const developerJobSkillSchema = z
  .object({
    skill: nonEmptyText('Skill', 180),
    whyItMatters: nonEmptyText('Skill rationale', 240),
  })
  .strict();

const takeHomeTaskSchema = z
  .object({
    evaluationFocus: z.array(nonEmptyText('Evaluation focus', 180)).min(3).max(6),
    expectedDeliverables: z.array(nonEmptyText('Expected deliverable', 180)).min(2).max(6),
    instructions: z.array(nonEmptyText('Task instruction', 260)).min(3).max(8),
    timeBox: nonEmptyText('Time box', 120),
    title: nonEmptyText('Task title', 140),
  })
  .strict();

const evaluationRubricItemSchema = z
  .object({
    concernSignal: nonEmptyText('Concern signal', 220),
    criterion: nonEmptyText('Rubric criterion', 160),
    strongSignal: nonEmptyText('Strong signal', 220),
    weight: nonEmptyText('Rubric weight', 80),
  })
  .strict();

const redFlagSchema = z
  .object({
    redFlag: nonEmptyText('Red flag', 220),
    whyItMatters: nonEmptyText('Red flag rationale', 260),
  })
  .strict();

const priceTimelineGuidanceSchema = z
  .object({
    assumptions: z.array(nonEmptyText('Price and timeline assumption', 200)).min(2).max(6),
    priceGuidance: nonEmptyText('Price guidance', 320),
    timelineGuidance: nonEmptyText('Timeline guidance', 320),
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

const confidenceLevelSchema = z.enum(['low', 'medium', 'high']);

const quoteVerdictSchema = z.enum([
  'fair',
  'risky',
  'overpriced',
  'under_scoped',
  'unrealistic',
]);

const parsedScopeItemSchema = z
  .object({
    complexity: z.enum(['low', 'medium', 'high']),
    confidenceLevel: confidenceLevelSchema,
    description: nonEmptyText('Scope item description', 280),
    pricingConcern: nonEmptyText('Scope item pricing concern', 260),
    scopeItem: nonEmptyText('Scope item', 180),
    specificity: z.enum(['specific', 'partial', 'vague']),
  })
  .strict();

const quotedPriceSchema = z
  .object({
    amount: z.number().positive().nullable(),
    basis: z.enum(['fixed_bid', 'hourly', 'monthly', 'milestone', 'unclear']),
    currency: z.string().trim().min(3).max(3).nullable(),
    notes: nonEmptyText('Quoted price notes', 240),
  })
  .strict();

const complexityEstimateSchema = z
  .object({
    confidenceLevel: confidenceLevelSchema,
    drivers: z.array(nonEmptyText('Complexity driver', 220)).min(2).max(8),
    level: z.enum(['low', 'medium', 'high', 'very_high']),
    rationale: nonEmptyText('Complexity rationale', 320),
  })
  .strict();

const timelineRealismSchema = z
  .object({
    confidenceLevel: confidenceLevelSchema,
    concerns: z.array(nonEmptyText('Timeline concern', 220)).min(1).max(8),
    rationale: nonEmptyText('Timeline rationale', 320),
    verdict: z.enum(['realistic', 'aggressive', 'unrealistic', 'unclear']),
  })
  .strict();

const priceFairnessSchema = z
  .object({
    confidenceLevel: confidenceLevelSchema,
    rationale: nonEmptyText('Price fairness rationale', 360),
    verdict: quoteVerdictSchema,
  })
  .strict();

const pricingRiskSchema = z
  .object({
    confidenceLevel: confidenceLevelSchema,
    rationale: nonEmptyText('Pricing risk rationale', 300),
    riskLevel: z.enum(['low', 'medium', 'high']),
  })
  .strict();

const missingDeliverableSchema = z
  .object({
    deliverable: nonEmptyText('Missing deliverable', 180),
    whyItMatters: nonEmptyText('Missing deliverable rationale', 260),
  })
  .strict();

const contractGapSchema = z
  .object({
    gap: nonEmptyText('Contract gap', 200),
    risk: nonEmptyText('Contract gap risk', 280),
  })
  .strict();

const developerQuestionSchema = z
  .object({
    question: nonEmptyText('Question', 240),
    reason: nonEmptyText('Question reason', 240),
  })
  .strict();

const codeAuditFindingSchema = z
  .object({
    category: z.enum([
      'critical_risk',
      'security',
      'scalability',
      'maintainability',
      'delivery_risk',
    ]),
    confidenceLevel: z.enum(['low', 'medium', 'high']),
    evidence: nonEmptyText('Audit finding evidence', 360),
    explanation: nonEmptyText('Audit finding explanation', 320),
    impact: nonEmptyText('Audit finding impact', 280),
    priority: z.enum(['p0', 'p1', 'p2', 'p3']),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    suggestedFix: nonEmptyText('Audit finding suggested fix', 320),
    title: nonEmptyText('Audit finding title', 180),
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
  costControlAdvice: z.array(roadmapCostControlSchema).min(3).max(8),
  developerHandoffChecklist: z.array(roadmapHandoffChecklistItemSchema).min(5).max(12),
  executiveSummary: nonEmptyText('Executive summary', 1200),
  decisionLog: z.array(nonEmptyText('Roadmap decision log entry', 240)).min(2).max(8),
  featureTable: z.array(roadmapFeatureRowSchema).min(6).max(20),
  milestones: z.array(roadmapMilestoneSchema).min(3).max(8),
  phase1Mvp: roadmapPhaseSchema.extend({
    title: z.literal('Phase 1 MVP'),
  }),
  phase2Growth: roadmapPhaseSchema.extend({
    title: z.literal('Phase 2 Growth'),
  }),
  phase3Scale: roadmapPhaseSchema.extend({
    title: z.literal('Phase 3 Scale'),
  }),
  moduleType: z.literal('roadmap'),
  recommendation: nonEmptyText('Roadmap recommendation', 320),
  riskRegister: z.array(roadmapRiskSchema).min(3).max(10),
  technicalDependencies: z.array(roadmapDependencySchema).min(3).max(10),
  timelineEstimate: roadmapTimelineEstimateSchema,
});

export const stackAdviceOutputSchema = baseModuleOutputSchema.extend({
  categories: z
    .array(stackAdviceCategorySchema)
    .min(10)
    .max(11)
    .superRefine((items, ctx) => {
      const requiredCategories = [
        'frontend',
        'backend',
        'database',
        'auth',
        'hosting',
        'payments',
        'analytics',
        'email',
        'file_storage',
        'monitoring',
      ] as const;
      const seen = new Set<string>();

      for (const [index, item] of items.entries()) {
        if (seen.has(item.category)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Duplicate category: ${item.category}.`,
            path: [index, 'category'],
          });
        }

        seen.add(item.category);
      }

      for (const category of requiredCategories) {
        if (!seen.has(category)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Missing required category: ${category}.`,
            path: ['categories'],
          });
        }
      }

      const aiToolsCount = items.filter((item) => item.category === 'ai_tools').length;

      if (aiToolsCount > 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Include at most one AI tools recommendation.',
          path: ['categories'],
        });
      }
    }),
  executiveSummary: nonEmptyText('Executive summary', 1200),
  moduleType: z.literal('STACK_ADVICE'),
  recommendation: nonEmptyText('Overall recommendation', 320),
  scaleView: nonEmptyText('Scale view', 720),
  teamAssumption: nonEmptyText('Team assumption', 360),
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

const auditActionSchema = z
  .object({
    action: nonEmptyText('Audit action', 240),
    priority: z.enum(['low', 'medium', 'high']),
    reason: nonEmptyText('Audit action reason', 280),
  })
  .strict();

const auditAcceptableSchema = z
  .object({
    area: nonEmptyText('Acceptable area', 220),
    evidence: nonEmptyText('Acceptable evidence', 300),
    explanation: nonEmptyText('Acceptable explanation', 280),
  })
  .strict();

const auditQuestionSchema = z
  .object({
    priority: z.enum(['low', 'medium', 'high']),
    question: nonEmptyText('Audit question', 240),
    reason: nonEmptyText('Audit question reason', 280),
  })
  .strict();

export const developerJobDescriptionSchema = baseModuleOutputSchema.extend({
  employmentType: z.enum(['contractor', 'fractional', 'full_time', 'agency', 'mixed']),
  evaluationRubric: z.array(evaluationRubricItemSchema).min(4).max(8),
  moduleType: z.literal('developer_job_description'),
  niceToHaveSkills: z.array(developerJobSkillSchema).min(2).max(10),
  priceTimelineGuidance: priceTimelineGuidanceSchema,
  projectContext: developerJobProjectContextSchema,
  redFlags: z.array(redFlagSchema).min(4).max(10),
  requiredSkills: z.array(developerJobSkillSchema).min(4).max(12),
  roleTitle: nonEmptyText('Role title', 140),
  roleSummary: nonEmptyText('Role summary', 320),
  screeningQuestions: z.array(interviewQuestionSchema).min(5).max(10),
  seniorityRecommendation: nonEmptyText('Seniority recommendation', 280),
  responsibilities: z.array(jobResponsibilitySchema).min(4).max(10),
  recommendation: nonEmptyText('Job description recommendation', 320),
  takeHomeTask: takeHomeTaskSchema,
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
  dangerousContractGaps: z.array(contractGapSchema).min(2).max(10),
  estimatedComplexity: complexityEstimateSchema,
  missingDeliverables: z.array(missingDeliverableSchema).min(2).max(10),
  moduleType: z.literal('quote_analysis'),
  negotiationScript: z.string().trim().min(120).max(4000),
  overchargeRisk: pricingRiskSchema,
  parsedScopeItems: z.array(parsedScopeItemSchema).min(1).max(16),
  priceFairnessVerdict: priceFairnessSchema,
  questionsToAskDeveloper: z.array(developerQuestionSchema).min(3).max(12),
  quotedPrice: quotedPriceSchema,
  recommendation: nonEmptyText('Quote analysis recommendation', 320),
  riskScore: z.number().int().min(0).max(100),
  timelineRealism: timelineRealismSchema,
  underchargeRisk: pricingRiskSchema,
  totalRiskLevel: z.enum(['low', 'medium', 'high', 'critical']),
  vagueScopeFlags: z.array(nonEmptyText('Vague scope flag', 240)).min(1).max(10),
  vendorSummary: nonEmptyText('Vendor summary', 280),
  valueJudgment: nonEmptyText('Value judgment', 320),
});

export const codeAuditSchema = baseModuleOutputSchema.extend({
  acceptableAreas: z.array(auditAcceptableSchema).min(2).max(10),
  criticalRisks: z.array(codeAuditFindingSchema).min(1).max(8),
  disclaimer: nonEmptyText('Code audit disclaimer', 240),
  executiveSummary: nonEmptyText('Executive summary', 1600),
  findings: z
    .array(codeAuditFindingSchema)
    .min(4)
    .max(16)
    .superRefine((items, ctx) => {
      const priorityOrder = ['p0', 'p1', 'p2', 'p3'] as const;

      for (const [index, item] of items.entries()) {
        const nextItem = items[index + 1];

        if (!nextItem) {
          continue;
        }

        const currentIndex = priorityOrder.indexOf(item.priority as (typeof priorityOrder)[number]);
        const nextIndex = priorityOrder.indexOf(nextItem.priority as (typeof priorityOrder)[number]);

        if (currentIndex > nextIndex) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Findings must be sorted by priority from highest to lowest.',
            path: [index, 'priority'],
          });
          break;
        }
      }

      if (!items.some((item) => item.priority === 'p0')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Include at least one highest-priority finding.',
          path: ['findings'],
        });
      }
    }),
  moduleType: z.literal('code_audit'),
  overviewRiskLevel: z.enum(['low', 'medium', 'high', 'critical']),
  recommendedNextActions: z.array(auditActionSchema).min(3).max(10),
  questionsForDeveloper: z.array(auditQuestionSchema).min(3).max(12),
  recommendation: nonEmptyText('Code audit recommendation', 320),
  rushedWorkSignals: z.array(codeAuditFindingSchema).min(1).max(8),
  scalabilityIssues: z.array(codeAuditFindingSchema).min(1).max(8),
  securityIssues: z.array(codeAuditFindingSchema).min(1).max(8),
  maintainabilityIssues: z.array(codeAuditFindingSchema).min(1).max(8),
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
export type StackAdviceOutput = z.infer<typeof stackAdviceOutputSchema>;
export type TechStackRecommendationOutput = z.infer<typeof techStackRecommendationSchema>;
export type DeveloperJobDescriptionOutput = z.infer<typeof developerJobDescriptionSchema>;
export type TechnicalSpecificationOutput = z.infer<typeof technicalSpecificationSchema>;
export type QuoteAnalysisOutput = z.infer<typeof quoteAnalysisSchema>;
export type CodeAuditOutput = z.infer<typeof codeAuditSchema>;
export type VettingScorecardOutput = z.infer<typeof vettingScorecardSchema>;
