import { describe, expect, it, vi } from 'vitest';

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
});
