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

const mustHaveFeatureSchema = z.string().trim().min(12).max(140);

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

export const projectIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const projectDocumentsQuerySchema = z.object({
  type: z.preprocess((value) => {
    if (typeof value === 'string') {
      return value.trim().toLowerCase();
    }

    return 'roadmap';
  }, z.literal('roadmap')),
});

export type ProjectPayloadInput = z.infer<typeof projectPayloadSchema>;
export type UpdateProjectPayloadInput = z.infer<typeof updateProjectPayloadSchema>;
export type ProjectDocumentsQueryInput = z.infer<typeof projectDocumentsQuerySchema>;
