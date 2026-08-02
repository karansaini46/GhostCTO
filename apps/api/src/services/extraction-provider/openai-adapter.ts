import { logger } from '../../lib/logger.js';
import { ExtractionProviderError } from './errors.js';
import type { ExtractionProviderOptions, ExtractionRequest, ExtractionResponse } from './types.js';

export class OpenAICompatibleExtractionProvider {
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor({ apiKey, baseUrl, model }: ExtractionProviderOptions) {
    if (!apiKey) {
      throw new ExtractionProviderError({
        code: 'PROVIDER_NOT_CONFIGURED',
        message: 'Extraction provider API key is missing.',
      });
    }

    this.apiKey = apiKey;
    this.baseUrl = baseUrl || 'https://api.openai.com';
    this.model = model || 'gpt-4o-mini';
  }

  async extractJson(prompt: string): Promise<string> {
    const url = `${this.baseUrl}/v1/chat/completions`;

    const requestBody: ExtractionRequest = {
      model: this.model,
      messages: [
        {
          role: 'system',
          content: 'You must respond with valid JSON only. Do not include markdown, code fences, or explanatory text.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 1024,
      temperature: 0.1,
      response_format: { type: 'json_object' },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (response.status === 429) {
      throw new ExtractionProviderError({
        code: 'PROVIDER_RATE_LIMITED',
        message: 'Rate limit exceeded.',
        retryable: true,
        statusCode: response.status,
      });
    }

    if (!response.ok) {
      throw new ExtractionProviderError({
        code: 'PROVIDER_REQUEST_FAILED',
        message: `Request failed with status ${response.status}`,
        retryable: response.status >= 500,
        statusCode: response.status,
      });
    }

    const data = (await response.json()) as ExtractionResponse;
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new ExtractionProviderError({
        code: 'PROVIDER_RESPONSE_EMPTY',
        message: 'Empty response content',
      });
    }

    if (data.usage) {
      logger.info('Extraction token usage', {
        inputTokens: data.usage.prompt_tokens,
        outputTokens: data.usage.completion_tokens,
        provider: 'extraction',
      });
    }

    return content;
  }
}
