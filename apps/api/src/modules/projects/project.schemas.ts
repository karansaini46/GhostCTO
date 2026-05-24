import { z } from 'zod';

const wordCount = (value: string): number => value.trim().split(/\s+/).filter(Boolean).length;

const detailedText = (
  label: string,
  minCharacters: number,
  minWords: number,
  maxCharacters: number,
) =>
  z
    .string()
    .trim()
    .min(minCharacters, `${label} needs more detail.`)
    .max(maxCharacters, `${label} is too long.`)
    .refine((value) => wordCount(value) >= minWords, {
      message: `${label} needs a more complete answer.`,
    });

const projectNameSchema = z.string().trim().min(3).max(80);

const existingAssetSchema = z.enum([
  'customer_interviews',
  'waitlist',
  'landing_page',
  'designs',
  'prototype',
  'domain',
  'brand_assets',
  'analytics',
  'no_assets',
]);

const mustHaveFeatureSchema = z.string().trim().min(12).max(1000);

const specContextItemSchema = z.string().trim().min(2).max(280);

const optionalTrimmedText = (maxCharacters: number) =>
  z
    .string()
    .trim()
    .max(maxCharacters)
    .optional()
    .nullable()
    .transform((value) => (value ? value : null));

const githubRepositoryUrlSchema = z
  .string()
  .trim()
  .url('Enter a valid GitHub repository URL.')
  .max(2048, 'Repository URL is too long.')
  .refine(
    (value) => {
      try {
        const url = new URL(value);
        const hostname = url.hostname.toLowerCase();
        const pathSegments = url.pathname.split('/').filter(Boolean);

        return (
          url.protocol === 'https:' &&
          (hostname === 'github.com' || hostname === 'www.github.com') &&
          pathSegments.length === 2
        );
      } catch {
        return false;
      }
    },
    {
      message: 'Provide the root GitHub repository URL, such as https://github.com/owner/repo.',
    },
  );

export const emptyMutationBodySchema = z.object({}).strict();

export const projectPayloadSchema = z
  .object({
    biggestConcern: detailedText('Biggest concern', 50, 8, 1200),
    budgetRange: z.enum([
      'under_5000',
      '5000_15000',
      '15000_50000',
      '50000_100000',
      'over_100000',
      'not_set',
    ]),
    currentStage: z.enum(['idea', 'validating', 'prototype', 'mvp', 'beta', 'launched', 'scaling']),
    existingAssets: z
      .array(existingAssetSchema)
      .min(1, 'Select the assets you already have, or choose none yet.')
      .max(9)
      .refine((values) => !values.includes('no_assets') || values.length === 1, {
        message: 'Choose either no assets yet or specific assets.',
      }),
    founderTechnicalLevel: z.enum(['non_technical', 'beginner', 'intermediate', 'technical']),
    ideaSummary: detailedText('Idea summary', 80, 12, 1600),
    industry: z.string().trim().min(2).max(80),
    launchTimeline: z.enum([
      'within_4_weeks',
      '4_to_8_weeks',
      '8_to_12_weeks',
      '3_to_6_months',
      'more_than_6_months',
      'flexible',
    ]),
    monetization: z.enum([
      'subscription',
      'transaction_fee',
      'one_time_purchase',
      'services',
      'freemium',
      'licensing',
      'not_decided',
    ]),
    mustHaveFeatures: z
      .array(mustHaveFeatureSchema)
      .min(3, 'List at least three must-have features.')
      .max(10, 'Keep the launch scope to ten must-have features or fewer.')
      .refine(
        (values) => new Set(values.map((value) => value.toLowerCase())).size === values.length,
        {
          message: 'Must-have features should not repeat.',
        },
      ),
    name: projectNameSchema,
    productType: z.enum([
      'saas',
      'marketplace',
      'consumer_app',
      'internal_tool',
      'commerce',
      'community',
      'content',
      'services',
      'hardware_enabled',
    ]),
    targetCustomer: detailedText('Target customer', 60, 10, 1200),
  })
  .strict();

export const updateProjectPayloadSchema = projectPayloadSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one project field to update.',
  });

export const deleteProjectPayloadSchema = z
  .object({
    confirmationName: z.string().min(1).max(200),
  })
  .strict();

export const projectIdParamSchema = z
  .object({
    id: z.string().uuid(),
  })
  .strict();

export const documentExportParamsSchema = z
  .object({
    documentId: z.string().uuid(),
    projectId: z.string().uuid(),
  })
  .strict();

export const documentDetailParamsSchema = z
  .object({
    documentId: z.string().uuid(),
    id: z.string().uuid(),
  })
  .strict();

export const projectDocumentsQuerySchema = z
  .object({
    type: z.preprocess(
      (value) => {
        if (value === undefined || value === null || value === '') {
          return undefined;
        }

        if (typeof value === 'string') {
          return value.trim().toLowerCase();
        }

        return undefined;
      },
      z
        .enum([
          'code_audit',
          'developer_jd',
          'rate_validator',
          'roadmap',
          'stack_advisor',
          'technical_spec',
          'vetting_scorecard',
        ])
        .optional(),
    ),
  })
  .strict();

export const stackAdviceOverridesSchema = z
  .object({
    budgetRange: z.enum([
      'under_5000',
      '5000_15000',
      '15000_50000',
      '50000_100000',
      'over_100000',
      'not_set',
    ]),
    complianceSensitivity: z.enum(['low', 'medium', 'high']),
    speedPriority: z.enum(['low', 'medium', 'high']),
    founderTechnicalLevel: z.enum(['non_technical', 'beginner', 'intermediate', 'technical']),
    targetScale: z.enum(['pre_launch', 'early_mvp', 'growth_ready', 'multi_team']),
  })
  .partial()
  .strict();

export const technicalSpecRequestSchema = z
  .object({
    constraints: z.array(specContextItemSchema).max(12),
    existingSystemNotes: z.array(specContextItemSchema).max(12),
    featureDescription: detailedText('Feature description', 50, 8, 3000),
    featureName: z.string().trim().min(3).max(120),
    priority: z.enum(['low', 'medium', 'high', 'critical']),
  })
  .strict();

export const codeAuditRequestSchema = z
  .object({
    codeSnippet: z
      .string()
      .trim()
      .min(120, 'Paste enough code for a meaningful audit.')
      .max(50000, 'Code snippet is too long.')
      .optional()
      .nullable()
      .transform((value) => (value?.length ? value : null)),
    repoUrl: z
      .preprocess(
        (value) => (typeof value === 'string' && !value.trim() ? null : value),
        githubRepositoryUrlSchema.optional().nullable(),
      )
      .transform((value) => (value ? value : null)),
  })
  .strict()
  .refine((value) => Boolean(value.repoUrl) !== Boolean(value.codeSnippet), {
    message: 'Provide either a GitHub repository URL or a code snippet.',
    path: ['repoUrl'],
  });

export const quoteAnalysisRequestSchema = z
  .object({
    countryMarket: optionalTrimmedText(120),
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/, 'Currency must be a three-letter code.')
      .optional()
      .nullable()
      .transform((value) => value ?? null),
    deadline: optionalTrimmedText(160),
    developerType: z.enum(['freelancer', 'agency', 'unknown']).optional().default('unknown'),
    projectUrgency: z.enum(['urgent', 'within_30_days', 'within_60_days', 'flexible']),
    proposalText: detailedText('Proposal text', 120, 18, 20000),
  })
  .strict();

export const vettingRequestSchema = z
  .object({
    founderConcern: detailedText('Founder concern', 30, 5, 2000),
    portfolioText: detailedText('Portfolio or profile text', 120, 18, 20000),
    proposalText: detailedText('Proposal text', 120, 18, 20000),
    subjectName: z.string().trim().min(2, 'Name is required.').max(120, 'Name is too long.'),
    websiteUrl: z
      .string()
      .trim()
      .url('Enter a valid website URL.')
      .max(2048, 'Website URL is too long.')
      .optional()
      .nullable()
      .transform((value) => (value ? value : null)),
  })
  .strict();

const queryInteger = (defaultValue: number, maxValue: number) =>
  z.preprocess((value) => {
    const rawValue = Array.isArray(value) ? value[0] : value;

    if (rawValue === undefined || rawValue === null || rawValue === '') {
      return defaultValue;
    }

    return Number(rawValue);
  }, z.number().int().min(1).max(maxValue));

export const chatMessageRequestSchema = z
  .object({
    message: detailedText('Message', 2, 1, 4000),
  })
  .strict();

export const chatMessagesQuerySchema = z
  .object({
    limit: queryInteger(30, 50),
    page: queryInteger(1, 1000),
  })
  .strict();

export type ProjectPayloadInput = z.infer<typeof projectPayloadSchema>;
export type UpdateProjectPayloadInput = z.infer<typeof updateProjectPayloadSchema>;
export type DeleteProjectPayloadInput = z.infer<typeof deleteProjectPayloadSchema>;
export type DocumentDetailParamsInput = z.infer<typeof documentDetailParamsSchema>;
export type DocumentExportParamsInput = z.infer<typeof documentExportParamsSchema>;
export type ProjectDocumentsQueryInput = z.infer<typeof projectDocumentsQuerySchema>;
export type StackAdviceOverridesInput = z.infer<typeof stackAdviceOverridesSchema>;
export type TechnicalSpecRequestInput = z.infer<typeof technicalSpecRequestSchema>;
export type CodeAuditRequestInput = z.infer<typeof codeAuditRequestSchema>;
export type QuoteAnalysisRequestInput = z.infer<typeof quoteAnalysisRequestSchema>;
export type VettingRequestInput = z.infer<typeof vettingRequestSchema>;
export type ChatMessageRequestInput = z.infer<typeof chatMessageRequestSchema>;
export type ChatMessagesQueryInput = z.infer<typeof chatMessagesQuerySchema>;
