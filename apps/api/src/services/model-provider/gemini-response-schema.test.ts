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
});
