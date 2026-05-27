import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { GeminiModelProvider } from './gemini-adapter.js';
import { MODELS } from './models.js';
import type { GenerativeModel } from '@google/generative-ai';
import type { ModelTier } from './models.js';

const createProvider = (options: { modelName?: string } = {}) => {
  const models: string[] = [];

  const provider = new GeminiModelProvider({
    apiKey: 'local-provider',
    createModel: (model) => {
      models.push(model);

      return {
        generateContent: vi.fn(async () => {
          return {
            response: {
              candidates: [
                {
                  content: {
                    parts: [{ text: 'Generated response.' }],
                    role: 'model',
                  },
                  finishReason: 'STOP',
                  index: 0,
                },
              ],
              functionCall: () => undefined,
              functionCalls: () => undefined,
              text: () => 'Generated response.',
              usageMetadata: {
                candidatesTokenCount: 7,
                promptTokenCount: 5,
                totalTokenCount: 12,
              },
            },
          };
        }),
      } as Pick<GenerativeModel, 'generateContent'>;
    },
    modelName: options.modelName,
  });

  return {
    models,
    provider,
  };
};

describe('GeminiModelProvider', () => {
  it.each([
    { expected: MODELS.default, tier: undefined },
    { expected: MODELS.quality, tier: 'quality' },
    { expected: MODELS.pro, tier: 'pro' },
  ] satisfies Array<{ expected: string; tier?: ModelTier }>)(
    'uses $expected for model tier $tier',
    async ({ expected, tier }) => {
      const { models, provider } = createProvider();

      const result = await provider.generateText({
        modelTier: tier,
        prompt: 'Write a concise founder update.',
        requestName: 'test.request',
      });

      expect(models).toEqual([expected]);
      expect(result).toMatchObject({
        finishReason: 'STOP',
        text: 'Generated response.',
        usage: {
          inputTokens: 5,
          outputTokens: 7,
          totalTokens: 12,
        },
      });
    },
  );

  it('keeps approved model names centralized', () => {
    expect(MODELS).toEqual({
      default: 'gemini-2.5-flash',
      quality: 'gemini-2.5-flash',
      pro: 'gemini-2.5-pro',
    });
    expect(Object.values(MODELS).every((model) => !model.includes('1.5'))).toBe(true);
  });

  it('uses the configured model name when one is provided', async () => {
    const { models, provider } = createProvider({ modelName: 'gemini-custom' });

    await provider.generateText({
      modelTier: 'pro',
      prompt: 'Write a concise founder update.',
      requestName: 'test.request',
    });

    expect(models).toEqual(['gemini-custom']);
  });

  it('sends a JSON response schema and system instruction for structured output', async () => {
    const requests: unknown[] = [];
    const provider = new GeminiModelProvider({
      apiKey: 'local-provider',
      createModel: () =>
        ({
          generateContent: vi.fn(async (request) => {
            requests.push(request);

            return {
              response: {
                candidates: [
                  {
                    content: {
                      parts: [
                        {
                          text: JSON.stringify({
                            items: ['First milestone'],
                            moduleType: 'roadmap',
                            reportMarkdown: '# Roadmap',
                          }),
                        },
                      ],
                      role: 'model',
                    },
                    finishReason: 'STOP',
                    index: 0,
                  },
                ],
                functionCall: () => undefined,
                functionCalls: () => undefined,
                text: () => 'Generated response.',
              },
            };
          }),
        }) as Pick<GenerativeModel, 'generateContent'>,
    });

    await provider.generateStructured({
      prompt: 'Create a roadmap.',
      requestName: 'test.structured',
      schema: z
        .object({
          items: z.array(z.string()).min(1),
          moduleType: z.literal('roadmap'),
          reportMarkdown: z.string(),
        })
        .strict(),
    });

    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      contents: [
        {
          parts: [{ text: 'Create a roadmap.' }],
          role: 'user',
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          properties: {
            items: {
              items: {
                type: 'string',
              },
              type: 'array',
            },
            moduleType: {
              enum: ['roadmap'],
              type: 'string',
            },
            reportMarkdown: {
              type: 'string',
            },
          },
          required: ['items', 'moduleType', 'reportMarkdown'],
          type: 'object',
        },
      },
      systemInstruction: expect.stringContaining('Return exactly one JSON object'),
    });
  });
});
