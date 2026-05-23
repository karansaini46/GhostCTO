import { buildStructuredPrompt } from './output-requirements.js';
import { type ProjectPromptContext } from './project-context.js';
import {
  codeAuditSchema,
  developerJobDescriptionSchema,
  ghostctoModuleTypes,
  quoteAnalysisSchema,
  roadmapOutputSchema,
  stackAdviceOutputSchema,
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
  stack_advice: ModulePromptDefinition<typeof stackAdviceOutputSchema>;
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

const stackAdvicePrompt = (project: ProjectPromptContext) =>
  buildModulePrompt({
    project,
    requirements: joinRequirements(
      'The markdown report must compare the recommended stack against practical alternatives and explain the tradeoffs in founder-friendly language.',
      'Cover frontend, backend, database, auth, hosting, payments, analytics, email, file storage, monitoring, and AI tools only if they are genuinely useful.',
      'Tune the recommendation to the project budget, expected team shape, target scale, compliance sensitivity, launch timeline, and speed priority.',
      'Use the cards array for the primary recommendation, highest risk, and operational burden so the UI can scan the result quickly.',
    ),
    schemaDescription:
      'Return { moduleType, reportMarkdown, cards, assumptions, risks, nextSteps, executiveSummary, recommendation, teamAssumption, scaleView, categories }. The categories array must include frontend, backend, database, auth, hosting, payments, analytics, email, file_storage, and monitoring, with ai_tools only if relevant. Each category item must include recommendation, whyItFits, whyNotCommonAlternative, costRiskLevel, costRisk, operationalComplexityLevel, operationalComplexity, founderExplanation, and commonAlternative.',
    schemaName: 'StackAdviceOutput',
    task: 'Recommend a specific technical stack for this project. Make the advice change based on the founder technical level, budget, stage, launch timeline, and expected team shape inferred from the project context. For each stack choice, give the recommended option, explain why it fits this project, explain why the common alternative is not the better fit here, and call out the cost and operational tradeoffs in plain language. Keep the output specific enough that a founder could hand it to a developer or vendor without needing extra translation.',
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
      'The markdown report must include these headings: Role title, Seniority recommendation, Employment type, Project context, Responsibilities, Required skills, Nice-to-have skills, Screening questions, Practical take-home task, Evaluation rubric, Red flags, Price and timeline guidance.',
      'Focus on role scope, delivery expectations, required skills, screening signals, practical work sample evidence, and hiring risks.',
      'Match the role to the project context, budget, launch timeline, stage, founder technical level, product type, and must-have features.',
      'Do not require every common technology. Only include technologies or specialties that are directly useful for this project.',
      'Avoid an unrealistically broad full-stack role unless the project scope, budget, and timeline make that breadth necessary; if it is necessary, explain the tradeoff clearly.',
      'Make the practical take-home task small enough for screening and close enough to the actual project to reveal delivery judgment.',
      'Price and timeline guidance must be directional, tied to assumptions, and written for a founder comparing candidates or contractors.',
      'Use the cards array to surface the role, engagement style, and hiring priority.',
    ),
    schemaDescription:
      'Return { moduleType, reportMarkdown, cards, assumptions, risks, nextSteps, recommendation, roleTitle, seniorityRecommendation, employmentType, roleSummary, responsibilities, requiredSkills, niceToHaveSkills, projectContext, screeningQuestions, takeHomeTask, evaluationRubric, redFlags, priceTimelineGuidance }. Each screening question includes what strong answers should show.',
    schemaName: 'DeveloperJobDescriptionOutput',
    task: 'Write a developer job description for the most appropriate first technical hire or contractor. Make it specific to the project stage, scope, budget, and launch timeline. Define the role title, seniority, engagement type, work the person must own, required skills, useful but optional skills, screening questions, practical take-home task, evaluation rubric, red flags, and expected price and timeline guidance.',
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
      'The markdown report must evaluate the quote as a founder would: price, scope, timeline, delivery risk, and what needs clarification before signing.',
      'Do not pretend exact pricing certainty. Give confidence levels, state assumptions, and explain what information is missing.',
      'Flag vague scope, unrealistic timelines, missing deliverables, dangerous contract gaps, and places where the price may be inflated or suspiciously low.',
      'The price fairness verdict must be one of: fair, risky, overpriced, under_scoped, or unrealistic.',
      'Use the cards array for the headline verdict, confidence, risk score, and top negotiation point.',
    ),
    schemaDescription:
      'Return { moduleType, reportMarkdown, cards, assumptions, risks, nextSteps, recommendation, vendorSummary, valueJudgment, totalRiskLevel, riskScore, quotedPrice, parsedScopeItems, estimatedComplexity, timelineRealism, priceFairnessVerdict, overchargeRisk, underchargeRisk, missingDeliverables, dangerousContractGaps, vagueScopeFlags, questionsToAskDeveloper, negotiationScript }. Every verdict or risk judgment must include a confidence level or stated assumption.',
    schemaName: 'QuoteAnalysisOutput',
    task: 'Analyze a vendor or contractor quote. Compare the quote against likely delivery effort, scope clarity, timeline realism, and contract risk. Identify parsed scope items, estimated complexity, price fairness verdict, overcharge and undercharge risks, missing deliverables, dangerous contract gaps, exact questions the founder should ask, and a direct but professional negotiation script. Give a clear recommendation the founder can act on immediately.',
  });

const codeAuditPrompt = (project: ProjectPromptContext) =>
  buildModulePrompt({
    project,
    requirements: joinRequirements(
      'The markdown report must read like an advisory audit a founder can use to decide whether the codebase is safe to continue investing in.',
      'Prioritize security, reliability, maintainability, delivery risk, and signs of rushed work over cosmetic observations.',
      'Include a clear disclaimer that this is not a complete penetration test or certification.',
      'Use the cards array for the highest-risk issues and the fastest fixes.',
    ),
    schemaDescription:
      'Return { moduleType, reportMarkdown, cards, assumptions, risks, nextSteps, recommendation, executiveSummary, disclaimer, overviewRiskLevel, findings, criticalRisks, securityIssues, scalabilityIssues, maintainabilityIssues, rushedWorkSignals, acceptableAreas, questionsForDeveloper, recommendedNextActions }. Each finding must include category, severity, priority, title, explanation, evidence, impact, confidenceLevel, and suggestedFix.',
    schemaName: 'CodeAuditOutput',
    task: 'Audit the codebase or implementation for delivery risk, maintainability problems, security issues, scalability concerns, and signs of rushed or poor work. Focus on findings that matter to a founder making investment or hiring decisions. Be specific about evidence, impact, and remediation. Keep the findings prioritized and the summary direct enough that a founder can act on it immediately.',
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
      'Return { moduleType, reportMarkdown, cards, assumptions, risks, nextSteps, recommendation, executiveSummary, disclaimer, overviewRiskLevel, findings, criticalRisks, securityIssues, scalabilityIssues, maintainabilityIssues, rushedWorkSignals, acceptableAreas, questionsForDeveloper, recommendedNextActions }. Each finding must include category, severity, priority, title, explanation, evidence, impact, confidenceLevel, and suggestedFix.',
    schemaName: 'CodeAuditOutput',
  },
  developer_job_description: {
    buildPrompt: developerJobDescriptionPrompt,
    schema: developerJobDescriptionSchema,
    schemaDescription:
      'Return { moduleType, reportMarkdown, cards, assumptions, risks, nextSteps, recommendation, roleTitle, seniorityRecommendation, employmentType, roleSummary, responsibilities, requiredSkills, niceToHaveSkills, projectContext, screeningQuestions, takeHomeTask, evaluationRubric, redFlags, priceTimelineGuidance }.',
    schemaName: 'DeveloperJobDescriptionOutput',
  },
  quote_analysis: {
    buildPrompt: quoteAnalysisPrompt,
    schema: quoteAnalysisSchema,
    schemaDescription:
      'Return { moduleType, reportMarkdown, cards, assumptions, risks, nextSteps, recommendation, vendorSummary, valueJudgment, totalRiskLevel, riskScore, quotedPrice, parsedScopeItems, estimatedComplexity, timelineRealism, priceFairnessVerdict, overchargeRisk, underchargeRisk, missingDeliverables, dangerousContractGaps, vagueScopeFlags, questionsToAskDeveloper, negotiationScript }.',
    schemaName: 'QuoteAnalysisOutput',
  },
  roadmap: {
    buildPrompt: roadmapPrompt,
    schema: roadmapOutputSchema,
    schemaDescription:
      'Return { moduleType, reportMarkdown, cards, assumptions, risks, nextSteps, recommendation, executiveSummary, phase1Mvp, phase2Growth, phase3Scale, featureTable, timelineEstimate, technicalDependencies, riskRegister, costControlAdvice, developerHandoffChecklist, decisionLog, milestones }.',
    schemaName: 'RoadmapOutput',
  },
  stack_advice: {
    buildPrompt: stackAdvicePrompt,
    schema: stackAdviceOutputSchema,
    schemaDescription:
      'Return { moduleType, reportMarkdown, cards, assumptions, risks, nextSteps, executiveSummary, recommendation, teamAssumption, scaleView, categories }.',
    schemaName: 'StackAdviceOutput',
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
