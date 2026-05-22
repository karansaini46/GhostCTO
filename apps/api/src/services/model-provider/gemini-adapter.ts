import { buildStructuredRetryPrompt } from '../prompts/index.js';
import { ModelProviderError } from './errors.js';
import { parseStructuredOutput } from './json.js';
import type {
  GenerateStructuredInput,
  GenerateStructuredResult,
  GenerateTextInput,
  GenerateTextResult,
  ModelProvider,
  ModelProviderUsage,
} from './types.js';
import type { z, ZodType } from 'zod';

type GeminiAdapterOptions = {
  apiKey?: string;
  baseUrl?: string;
  defaultMaxOutputTokens?: number;
  defaultTemperature?: number;
  model?: string;
};

type GeminiUsageMetadata = {
  candidatesTokenCount?: number;
  promptTokenCount?: number;
  totalTokenCount?: number;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
    finishReason?: string;
  }>;
  usageMetadata?: GeminiUsageMetadata;
};

type GeminiRequestOptions = GenerateTextInput & {
  responseMimeType?: 'application/json' | 'text/plain';
};

const defaultBaseUrl = 'https://generativelanguage.googleapis.com';

const normalizeModelName = (model: string) =>
  model.startsWith('models/') ? model.slice('models/'.length) : model;

const toUsage = (usage?: GeminiUsageMetadata): ModelProviderUsage | undefined => {
  if (!usage) {
    return undefined;
  }

  return {
    inputTokens: usage.promptTokenCount,
    outputTokens: usage.candidatesTokenCount,
    totalTokens: usage.totalTokenCount,
  };
};

const toText = (response: GeminiResponse) =>
  response.candidates
    ?.flatMap((candidate) => candidate.content?.parts ?? [])
    .map((part) => part.text)
    .filter((text): text is string => Boolean(text?.trim()))
    .join('\n')
    .trim() ?? '';

export class GeminiModelProvider implements ModelProvider {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultMaxOutputTokens: number;
  private readonly defaultTemperature: number;
  private readonly model: string;

  constructor({
    apiKey,
    baseUrl = defaultBaseUrl,
    defaultMaxOutputTokens = 4096,
    defaultTemperature = 0.2,
    model,
  }: GeminiAdapterOptions) {
    if (!apiKey) {
      throw new ModelProviderError({
        code: 'PROVIDER_NOT_CONFIGURED',
        message: 'Model provider credentials are not configured.',
      });
    }

    const modelName = model?.trim();

    if (!modelName) {
      throw new ModelProviderError({
        code: 'PROVIDER_NOT_CONFIGURED',
        message: 'Model provider name is not configured.',
      });
    }

    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.defaultMaxOutputTokens = defaultMaxOutputTokens;
    this.defaultTemperature = defaultTemperature;
    this.model = normalizeModelName(modelName);
  }

  async generateText(input: GenerateTextInput): Promise<GenerateTextResult> {
    return this.request(input);
  }

  async generateStructured<Schema extends ZodType>(
    input: GenerateStructuredInput<Schema>,
  ): Promise<GenerateStructuredResult<z.infer<Schema>>> {
    const firstResult = await this.request({
      ...input,
      responseMimeType: 'application/json',
    });
    const firstParseResult = parseStructuredOutput(firstResult.text, input.schema);

    if (firstParseResult.success) {
      return {
        ...firstResult,
        attempts: 1,
        data: firstParseResult.data,
      };
    }

    console.warn('Structured model output failed validation. Retrying once.', {
      issues: firstParseResult.issues,
      provider: 'gemini',
      requestName: input.requestName,
    });

    const retryPrompt =
      input.retryPrompt?.({
        originalPrompt: input.prompt,
        previousText: firstResult.text,
        requestName: input.requestName,
        validationSummary: firstParseResult.validationSummary,
      }) ??
      buildStructuredRetryPrompt({
        originalPrompt: input.prompt,
        previousText: firstResult.text,
        validationSummary: firstParseResult.validationSummary,
      });

    const retryResult = await this.request({
      ...input,
      prompt: retryPrompt,
      responseMimeType: 'application/json',
    });
    const retryParseResult = parseStructuredOutput(retryResult.text, input.schema);

    if (retryParseResult.success) {
      return {
        ...retryResult,
        attempts: 2,
        data: retryParseResult.data,
      };
    }

    console.warn('Structured model output failed validation after retry.', {
      issues: retryParseResult.issues,
      provider: 'gemini',
      requestName: input.requestName,
    });

    throw new ModelProviderError({
      code: 'INVALID_STRUCTURED_OUTPUT',
      message: 'The model returned output that could not be validated.',
      retryable: false,
    });
  }

  private async request({
    maxOutputTokens,
    prompt,
    requestName,
    responseMimeType,
    temperature,
  }: GeminiRequestOptions): Promise<GenerateTextResult> {
    const endpoint = new URL(
      `/v1beta/models/${encodeURIComponent(this.model)}:generateContent`,
      this.baseUrl,
    );

    let response: Response;

    try {
      response = await fetch(endpoint, {
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
              role: 'user',
            },
          ],
          generationConfig: {
            maxOutputTokens: maxOutputTokens ?? this.defaultMaxOutputTokens,
            responseMimeType,
            temperature: temperature ?? this.defaultTemperature,
          },
        }),
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey,
        },
        method: 'POST',
      });
    } catch {
      console.error('Model provider request failed before receiving a response.', {
        provider: 'gemini',
        requestName,
      });

      throw new ModelProviderError({
        code: 'PROVIDER_REQUEST_FAILED',
        message: 'Model provider request failed.',
        retryable: true,
      });
    }

    if (response.status === 429) {
      console.warn('Model provider rate limit reached.', {
        provider: 'gemini',
        requestName,
        retryAfter: response.headers.get('retry-after'),
        statusCode: response.status,
      });

      throw new ModelProviderError({
        code: 'PROVIDER_RATE_LIMITED',
        message: 'Model provider rate limit reached. Please retry shortly.',
        retryable: true,
        statusCode: response.status,
      });
    }

    if (!response.ok) {
      console.error('Model provider request returned an error.', {
        provider: 'gemini',
        requestName,
        statusCode: response.status,
      });

      throw new ModelProviderError({
        code: 'PROVIDER_REQUEST_FAILED',
        message: 'Model provider request failed.',
        retryable: response.status >= 500,
        statusCode: response.status,
      });
    }

    let body: GeminiResponse;

    try {
      body = (await response.json()) as GeminiResponse;
    } catch {
      console.error('Model provider response could not be parsed.', {
        provider: 'gemini',
        requestName,
      });

      throw new ModelProviderError({
        code: 'PROVIDER_REQUEST_FAILED',
        message: 'Model provider response could not be parsed.',
        retryable: true,
        statusCode: response.status,
      });
    }

    const usage = toUsage(body.usageMetadata);

    console.info('Model token usage.', {
      inputTokens: usage?.inputTokens,
      outputTokens: usage?.outputTokens,
      provider: 'gemini',
      requestName,
      totalTokens: usage?.totalTokens,
    });

    const text = toText(body);

    if (!text) {
      throw new ModelProviderError({
        code: 'PROVIDER_RESPONSE_EMPTY',
        message: 'Model provider returned an empty response.',
        retryable: true,
      });
    }

    return {
      finishReason: body.candidates?.[0]?.finishReason,
      text,
      usage,
    };
  }
}
