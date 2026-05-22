import { buildStructuredPrompt } from './output-requirements.js';
import { type ProjectPromptContext } from './project-context.js';
import {
  codeAuditSchema,
  developerJobDescriptionSchema,
  ghostctoModuleTypes,
  quoteAnalysisSchema,
  roadmapOutputSchema,
  technicalSpecificationSchema,
  techStackRecommendationSchema,
  type GhostCTOModuleType,
  vettingScorecardSchema,
} from './module-schemas.js';
import type { ZodTypeAny } from 'zod';

type ModulePromptDefinition<Schema extends ZodTypeAny> = {
  buildPrompt: (project: ProjectPromptContext) => string;
  schema: Schema;
  schemaDescription: string;
  schemaName: string;
};

type GhostCTOModulePromptMap = {
  code_audit: ModulePromptDefinition<typeof codeAuditSchema>;
  developer_job_description: ModulePromptDefinition<typeof developerJobDescriptionSchema>;
  quote_analysis: ModulePromptDefinition<typeof quoteAnalysisSchema>;
  roadmap: ModulePromptDefinition<typeof roadmapOutputSchema>;
  technical_specification: ModulePromptDefinition<typeof technicalSpecificationSchema>;
  tech_stack_recommendation: ModulePromptDefinition<typeof techStackRecommendationSchema>;
  vetting_scorecard: ModulePromptDefinition<typeof vettingScorecardSchema>;
};

const sharedPromptRequirements = [
  'Start the markdown report by anchoring it in the project context: idea, industry, budget, stage, and technical level.',
  'Think through the answer step by step before you write it. Keep the reasoning internal and do not expose private reasoning.',
  'Write in the voice of Marcus, a CTO with 15 years of startup experience from seed to Series B. Be direct, specific, and practical.',
  'Use founder-friendly language. Prefer concrete recommendations, named risks, explicit assumptions, and specific next steps.',
  'Never leave a recommendation at "it depends"; if tradeoffs exist, state them and still choose the best option.',
  'Review the draft for vagueness before finishing. Replace generic advice with specific guidance, then return the improved version.',
  'Return a JSON object that includes a markdown report string plus structured sections for UI cards and module-specific data.',
];

const joinRequirements = (...requirements: string[]) => [
  ...sharedPromptRequirements,
  ...requirements,
];

const buildModulePrompt = ({
  project,
  requirements,
  schemaDescription,
  schemaName,
  task,
}: {
  project: ProjectPromptContext;
  requirements: string[];
  schemaDescription: string;
  schemaName: string;
  task: string;
}) =>
  buildStructuredPrompt({
    project,
    requirements,
    schemaDescription,
    schemaName,
    task,
  });

const roadmapPrompt = (project: ProjectPromptContext) =>
  buildModulePrompt({
    project,
    requirements: joinRequirements(
      'The markdown report must include an executive summary, Phase 1 MVP, Phase 2 Growth, Phase 3 Scale, a feature table, a timeline estimate, technical dependencies, a risk register, cost-control advice, and a developer handoff checklist.',
      'State the MVP boundaries clearly: what is in scope, what is deferred, and what is excluded for now.',
      'Make the roadmap practical for a founder who needs sequencing, milestones, decision points, and budget discipline more than theory.',
      'Populate the cards array with founder-facing summaries that can be shown in the UI at a glance.',
    ),
    schemaDescription:
      'Return { moduleType, reportMarkdown, cards, assumptions, risks, nextSteps, recommendation, executiveSummary, phase1Mvp, phase2Growth, phase3Scale, featureTable, timelineEstimate, technicalDependencies, riskRegister, costControlAdvice, developerHandoffChecklist, decisionLog, milestones }. The phase objects must include title, boundary, goals, scope, deliverables, dependencies, exitCriteria, and durationWeeks.',
    schemaName: 'RoadmapOutput',
    task: 'Create a founder-ready technical roadmap for the project. Prioritize the smallest viable sequence of work, show exactly what belongs in the MVP, what belongs in later growth and scale phases, and what should not be built yet. Call out dependencies, timing assumptions, delivery risks, and cost-control advice in plain language. Avoid broad strategy language; the output should make it obvious what happens first, what comes next, and what can wait.',
  });

const techStackRecommendationPrompt = (project: ProjectPromptContext) =>
  buildModulePrompt({
    project,
    requirements: joinRequirements(
      'The markdown report must compare the recommended stack against the practical alternatives the founder is likely to consider.',
      'Cover frontend, backend, database, auth, hosting, testing, and any other layer that materially affects delivery or cost.',
      'Use the cards array for the top stack decisions so the UI can render a compact summary.',
    ),
    schemaDescription:
      'Return { moduleType, reportMarkdown, cards, assumptions, risks, nextSteps, recommendation, stack, rejectedOptions }. Each stack entry must include layer, decision, rationale, and tradeoffs.',
    schemaName: 'TechStackRecommendationOutput',
    task: 'Recommend a production-ready technical stack for the project. Choose the stack that best fits the project stage, budget, timeline, product complexity, and founder technical level. Explain the decisions in practical language, state the tradeoffs, and make it clear why each rejected option was not the better choice for this situation.',
  });

const developerJobDescriptionPrompt = (project: ProjectPromptContext) =>
  buildModulePrompt({
    project,
    requirements: joinRequirements(
      'The markdown report must be usable as the foundation of a real hiring brief or contractor brief.',
      'Focus on role scope, delivery expectations, required skills, interview signals, and the kind of evidence a candidate should provide.',
      'Use the cards array to surface the role, engagement style, and hiring priority.',
    ),
    schemaDescription:
      'Return { moduleType, reportMarkdown, cards, assumptions, risks, nextSteps, recommendation, roleSummary, responsibilities, mustHaveSkills, niceToHaveSkills, interviewQuestions }. Skills are categorized by importance and each interview question includes what strong answers should show.',
    schemaName: 'DeveloperJobDescriptionOutput',
    task: 'Write a developer job description for the most appropriate first technical hire or contractor. Make it specific to the project stage and scope. Define the work the person must actually own, the skills that matter, the questions that should be asked in interview, and the mistakes to avoid when hiring for this role.',
  });

const technicalSpecificationPrompt = (project: ProjectPromptContext) =>
  buildModulePrompt({
    project,
    requirements: joinRequirements(
      'The markdown report must read like a build-ready technical specification, not a generic summary.',
      'Include enough detail that an engineer or vendor can estimate the work without guessing at the scope.',
      'Use the cards array for the most important implementation decisions and delivery risks.',
    ),
    schemaDescription:
      'Return { moduleType, reportMarkdown, cards, assumptions, risks, nextSteps, recommendation, nonGoals, components, dataModel, apiEndpoints, implementationPhases, acceptanceCriteria }. Each section must be specific and actionable.',
    schemaName: 'TechnicalSpecificationOutput',
    task: 'Produce a technical specification that can guide implementation. Define the scope, non-goals, major components, data model, API surface, implementation phases, and acceptance criteria. Make the output concrete enough that a team can build from it and a founder can use it to control scope.',
  });

const quoteAnalysisPrompt = (project: ProjectPromptContext) =>
  buildModulePrompt({
    project,
    requirements: joinRequirements(
      'The markdown report must evaluate the quote as a founder would: price, scope, risks, and what needs clarification before signing.',
      'Call out line items or scope gaps that are likely to create overruns or disputes.',
      'Use the cards array for the headline quote judgment and major negotiation points.',
    ),
    schemaDescription:
      'Return { moduleType, reportMarkdown, cards, assumptions, risks, nextSteps, recommendation, vendorSummary, valueJudgment, totalRiskLevel, lineItems, scopeGaps, clarifyingQuestions }. Each line item must include item, amount, judgment, concern level, and comment.',
    schemaName: 'QuoteAnalysisOutput',
    task: 'Analyze a vendor or contractor quote. Compare the quote against likely delivery effort and scope risk, identify where the quote is fair or inflated, and point out missing scope, ambiguous wording, or hidden follow-on cost. Give a clear recommendation the founder can act on immediately.',
  });

const codeAuditPrompt = (project: ProjectPromptContext) =>
  buildModulePrompt({
    project,
    requirements: joinRequirements(
      'The markdown report must read like an audit a founder can use to decide whether the codebase is safe to continue investing in.',
      'Prioritize security, reliability, maintainability, and delivery risk over cosmetic observations.',
      'Use the cards array for the highest-risk issues and the fastest fixes.',
    ),
    schemaDescription:
      'Return { moduleType, reportMarkdown, cards, assumptions, risks, nextSteps, recommendation, overallAssessment, severitySummary, findings, securityNotes, maintainabilityNotes, remediationPlan, quickWins }. Each finding must include severity, title, evidence, impact, and fix.',
    schemaName: 'CodeAuditOutput',
    task: 'Audit the codebase or implementation for delivery risk, maintainability problems, security issues, and major gaps that could slow the team down. Focus on findings that matter to a founder making investment or hiring decisions. Be specific about evidence, impact, and remediation.',
  });

const vettingScorecardPrompt = (project: ProjectPromptContext) =>
  buildModulePrompt({
    project,
    requirements: joinRequirements(
      'The markdown report must support an interview or vendor evaluation decision, not just summarize impressions.',
      'Explain the scoring criteria in practical terms and make the final recommendation explicit.',
      'Use the cards array for overall score, verdict, and the most important strengths or concerns.',
    ),
    schemaDescription:
      'Return { moduleType, reportMarkdown, cards, assumptions, risks, nextSteps, recommendation, overallScore, verdict, concernSummary, strengths, criteria, followUpQuestions }. Each criterion must include a 1-5 score and notes.',
    schemaName: 'VettingScorecardOutput',
    task: 'Build a practical vetting scorecard for evaluating a developer, vendor, or technical partner. Keep the criteria grounded in delivery, communication, judgment, and fit for the project stage. Make the final recommendation unambiguous and explain what would change it.',
  });

export const ghostctoModulePrompts = {
  code_audit: {
    buildPrompt: codeAuditPrompt,
    schema: codeAuditSchema,
    schemaDescription:
      'Return { moduleType, reportMarkdown, cards, assumptions, risks, nextSteps, recommendation, overallAssessment, severitySummary, findings, securityNotes, maintainabilityNotes, remediationPlan, quickWins }.',
    schemaName: 'CodeAuditOutput',
  },
  developer_job_description: {
    buildPrompt: developerJobDescriptionPrompt,
    schema: developerJobDescriptionSchema,
    schemaDescription:
      'Return { moduleType, reportMarkdown, cards, assumptions, risks, nextSteps, recommendation, roleSummary, responsibilities, mustHaveSkills, niceToHaveSkills, interviewQuestions }.',
    schemaName: 'DeveloperJobDescriptionOutput',
  },
  quote_analysis: {
    buildPrompt: quoteAnalysisPrompt,
    schema: quoteAnalysisSchema,
    schemaDescription:
      'Return { moduleType, reportMarkdown, cards, assumptions, risks, nextSteps, recommendation, vendorSummary, valueJudgment, totalRiskLevel, lineItems, scopeGaps, clarifyingQuestions }.',
    schemaName: 'QuoteAnalysisOutput',
  },
  roadmap: {
    buildPrompt: roadmapPrompt,
    schema: roadmapOutputSchema,
    schemaDescription:
      'Return { moduleType, reportMarkdown, cards, assumptions, risks, nextSteps, recommendation, executiveSummary, phase1Mvp, phase2Growth, phase3Scale, featureTable, timelineEstimate, technicalDependencies, riskRegister, costControlAdvice, developerHandoffChecklist, decisionLog, milestones }.',
    schemaName: 'RoadmapOutput',
  },
  technical_specification: {
    buildPrompt: technicalSpecificationPrompt,
    schema: technicalSpecificationSchema,
    schemaDescription:
      'Return { moduleType, reportMarkdown, cards, assumptions, risks, nextSteps, recommendation, nonGoals, components, dataModel, apiEndpoints, implementationPhases, acceptanceCriteria }.',
    schemaName: 'TechnicalSpecificationOutput',
  },
  tech_stack_recommendation: {
    buildPrompt: techStackRecommendationPrompt,
    schema: techStackRecommendationSchema,
    schemaDescription:
      'Return { moduleType, reportMarkdown, cards, assumptions, risks, nextSteps, recommendation, stack, rejectedOptions }.',
    schemaName: 'TechStackRecommendationOutput',
  },
  vetting_scorecard: {
    buildPrompt: vettingScorecardPrompt,
    schema: vettingScorecardSchema,
    schemaDescription:
      'Return { moduleType, reportMarkdown, cards, assumptions, risks, nextSteps, recommendation, overallScore, verdict, concernSummary, strengths, criteria, followUpQuestions }.',
    schemaName: 'VettingScorecardOutput',
  },
} satisfies GhostCTOModulePromptMap;

export const buildGhostctoModulePrompt = (
  moduleType: GhostCTOModuleType,
  project: ProjectPromptContext,
) => {
  const definition = ghostctoModulePrompts[moduleType];

  return definition.buildPrompt(project);
};

export const getGhostctoModuleSchema = <ModuleType extends GhostCTOModuleType>(
  moduleType: ModuleType,
): GhostCTOModulePromptMap[ModuleType]['schema'] => ghostctoModulePrompts[moduleType].schema;

export { ghostctoModuleTypes };
