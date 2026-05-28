import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { roadmapOutputSchema } from '../prompts/module-schemas.js';
import { toGeminiResponseSchema } from './gemini-response-schema.js';

describe('toGeminiResponseSchema', () => {
  it('converts the production roadmap schema to a Gemini object schema', () => {
    const schema = toGeminiResponseSchema(roadmapOutputSchema);

    expect(schema).toMatchObject({
      properties: {
        featureTable: {
          items: {
            properties: {
              decision: {
                enum: ['in_scope', 'defer', 'exclude'],
                type: 'string',
              },
            },
            type: 'object',
          },
          type: 'array',
        },
        moduleType: {
          enum: ['roadmap'],
          type: 'string',
        },
        phase1Mvp: {
          properties: {
            title: {
              enum: ['Phase 1 MVP'],
              type: 'string',
            },
          },
          type: 'object',
        },
      },
      type: 'object',
    });
  });

  it('preserves optional nullable object properties without requiring them', () => {
    const schema = toGeminiResponseSchema(
      z
        .object({
          detail: z.string().nullable().optional(),
          title: z.string(),
        })
        .strict(),
    );

    expect(schema).toMatchObject({
      properties: {
        detail: {
          nullable: true,
          type: 'string',
        },
        title: {
          type: 'string',
        },
      },
      required: ['title'],
      type: 'object',
    });
  });

  it('propagates validation constraints like min/max strings, array item limits, etc. into descriptions', () => {
    const schema = toGeminiResponseSchema(
      z
        .object({
          shortString: z.string().max(10).describe('A short name'),
          boundString: z.string().min(3).max(20),
          longString: z.string().min(5),
          boundedArray: z.array(z.string()).min(2).max(5).describe('Items list'),
          boundedNumber: z.number().min(0.5).max(100.5),
        })
        .strict(),
    );

    expect(schema).toMatchObject({
      properties: {
        shortString: {
          description: 'A short name Maximum length is 10 characters.',
          type: 'string',
        },
        boundString: {
          description: 'Length must be between 3 and 20 characters.',
          type: 'string',
        },
        longString: {
          description: 'Minimum length is 5 characters.',
          type: 'string',
        },
        boundedArray: {
          description: 'Items list Must contain between 2 and 5 items.',
          type: 'array',
        },
        boundedNumber: {
          description: 'Must be between 0.5 and 100.5.',
          type: 'number',
        },
      },
      type: 'object',
    });
  });
});
