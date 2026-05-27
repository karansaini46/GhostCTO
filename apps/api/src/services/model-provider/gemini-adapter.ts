import { GoogleGenerativeAI as GoogleProviderClient } from '@google/generative-ai';
import { logger } from '../../lib/logger.js';
import { buildStructuredRetryPrompt } from '../prompts/index.js';
import { ModelProviderError } from './errors.js';
import { toGeminiResponseSchema } from './gemini-response-schema.js';
import { parseStructuredOutput } from './json.js';
import { resolveModelName } from './models.js';
import type {
  GenerateStructuredInput,
  GenerateStructuredResult,
  GenerateTextInput,
  GenerateTextResult,
  ModelProvider,
  ModelProviderUsage,
} from './types.js';
import type {
  EnhancedGenerateContentResponse,
  GenerateContentRequest,
  GenerativeModel,
  RequestOptions,
  ResponseSchema,
} from '@google/generative-ai';
import type { z, ZodType } from 'zod';

type GeminiAdapterOptions = {
  apiKey?: string;
  baseUrl?: string;
  createModel?: (model: string) => Pick<GenerativeModel, 'generateContent'>;
  defaultMaxOutputTokens?: number;
  defaultTemperature?: number;
  modelName?: string;
};

type GeminiUsageMetadata = {
  candidatesTokenCount?: number;
  promptTokenCount?: number;
  totalTokenCount?: number;
};

type GeminiResponse = EnhancedGenerateContentResponse;

type GeminiRequestOptions = GenerateTextInput & {
  responseMimeType?: 'application/json' | 'text/plain';
  responseSchema?: ResponseSchema;
};

type GeminiGenerationConfig = NonNullable<GenerateContentRequest['generationConfig']> & {
  thinkingConfig?: {
    thinkingBudget: number;
  };
};

const jsonSystemInstruction = [
  'You must respond with valid JSON only.',
  'Return exactly one JSON object at the top level, not an array.',
  'Do not include markdown formatting, code fences, or explanatory text.',
].join(' ');

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

const toStatusCode = (error: unknown) => {
  if (!error || typeof error !== 'object' || !('status' in error)) {
    return undefined;
  }

  const status = (error as { status?: unknown }).status;

  return typeof status === 'number' ? status : undefined;
};

const toStatusText = (error: unknown) => {
  if (!error || typeof error !== 'object' || !('statusText' in error)) {
    return undefined;
  }

  const statusText = (error as { statusText?: unknown }).statusText;

  return typeof statusText === 'string' ? statusText : undefined;
};

const toText = (response: GeminiResponse) => {
  const candidates = response.candidates;
  if (!candidates || candidates.length === 0) {
    return '';
  }

  const parts = candidates.flatMap((candidate) => candidate.content?.parts ?? []);

  // First try to get non-thinking text parts
  const textParts = parts
    .filter((part) => !('thought' in part && part.thought === true))
    .map((part) => ('text' in part && typeof part.text === 'string' ? part.text : undefined))
    .filter((text): text is string => Boolean(text?.trim()));

  if (textParts.length > 0) {
    return textParts.join('\n').trim();
  }

  // Fallback: if no non-thinking parts, try to get any text parts (including thinking)
  // This handles cases where thinkingBudget: 0 doesn't fully disable thinking
  const allTextParts = parts
    .map((part) => ('text' in part && typeof part.text === 'string' ? part.text : undefined))
    .filter((text): text is string => Boolean(text?.trim()));

  return allTextParts.join('\n').trim();
};

export class GeminiModelProvider implements ModelProvider {
  private readonly createModel: (model: string) => Pick<GenerativeModel, 'generateContent'>;
  private readonly defaultMaxOutputTokens: number;
  private readonly defaultTemperature: number;
  private readonly modelName?: string;

  constructor({
    apiKey,
    baseUrl,
    createModel,
    defaultMaxOutputTokens = 4096,
    defaultTemperature = 0.2,
    modelName,
  }: GeminiAdapterOptions) {
    if (!apiKey) {
      throw new ModelProviderError({
        code: 'PROVIDER_NOT_CONFIGURED',
        message: 'Model provider credentials are not configured.',
      });
    }

    if (createModel) {
      this.createModel = createModel;
    } else {
      const client = new GoogleProviderClient(apiKey);
      const requestOptions: RequestOptions | undefined = baseUrl ? { baseUrl } : undefined;

      this.createModel = (model) => client.getGenerativeModel({ model }, requestOptions);
    }

    this.defaultMaxOutputTokens = defaultMaxOutputTokens;
    this.defaultTemperature = defaultTemperature;
    this.modelName = modelName;
  }

  async generateText(input: GenerateTextInput): Promise<GenerateTextResult> {
    return this.request(input);
  }

  async generateStructured<Schema extends ZodType>(
    input: GenerateStructuredInput<Schema>,
  ): Promise<GenerateStructuredResult<z.infer<Schema>>> {
    let responseSchema: ResponseSchema | undefined;

    try {
      responseSchema = toGeminiResponseSchema(input.schema);
    } catch (error) {
      logger.warn(
        'Could not build Gemini response schema. Falling back to prompt-only JSON mode.',
        {
          errorMessage: error instanceof Error ? error.message : 'Unknown schema conversion error.',
          provider: 'gemini',
          requestName: input.requestName,
        },
      );
    }

    const firstResult = await this.request({
      ...input,
      responseMimeType: 'application/json',
      responseSchema,
    });
    const firstParseResult = parseStructuredOutput(firstResult.text, input.schema);

    if (firstParseResult.success) {
      return {
        ...firstResult,
        attempts: 1,
        data: firstParseResult.data,
      };
    }

    logger.warn('Structured model output failed validation. Retrying once.', {
      issues: firstParseResult.issues,
      provider: 'gemini',
      requestName: input.requestName,
      rawTextSnippet: firstResult.text.slice(0, 500),
      textLength: firstResult.text.length,
      isEmpty: firstResult.text.length === 0,
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
      responseSchema,
    });
    const retryParseResult = parseStructuredOutput(retryResult.text, input.schema);

    if (retryParseResult.success) {
      return {
        ...retryResult,
        attempts: 2,
        data: retryParseResult.data,
      };
    }

    logger.warn('Structured model output failed validation after retry.', {
      issues: retryParseResult.issues,
      provider: 'gemini',
      requestName: input.requestName,
      rawTextSnippet: retryResult.text.slice(0, 500),
      textLength: retryResult.text.length,
      isEmpty: retryResult.text.length === 0,
    });

    throw new ModelProviderError({
      code: 'INVALID_STRUCTURED_OUTPUT',
      message: 'The model returned output that could not be validated.',
      retryable: false,
    });
  }

  private async request({
    maxOutputTokens,
    modelTier,
    prompt,
    requestName,
    responseMimeType,
    responseSchema,
    temperature,
  }: GeminiRequestOptions): Promise<GenerateTextResult> {
    let response: GeminiResponse;

    try {
      const modelNameResolved = this.modelName ?? resolveModelName(modelTier);
      const model = this.createModel(modelNameResolved);

      const generationConfig: GeminiGenerationConfig = {
        maxOutputTokens: maxOutputTokens ?? this.defaultMaxOutputTokens,
        responseMimeType,
        temperature: temperature ?? this.defaultTemperature,
      };

      if (responseMimeType === 'application/json') {
        generationConfig.thinkingConfig = { thinkingBudget: 0 };
        if (responseSchema) {
          generationConfig.responseSchema = responseSchema;
        }
      }

      const contents: GenerateContentRequest['contents'] = [
        {
          parts: [{ text: prompt }],
          role: 'user',
        },
      ];

      const request: GenerateContentRequest = {
        contents,
        generationConfig,
      };

      if (responseMimeType === 'application/json') {
        request.systemInstruction = jsonSystemInstruction;
      }

      let result;
      let attempts = 0;
      const maxAttempts = 3;
      while (true) {
        try {
          result = await model.generateContent(request);
          break;
        } catch (error) {
          attempts += 1;
          const statusCode = toStatusCode(error);
          const isTransient = statusCode === 429 || (statusCode && statusCode >= 500);
          if (isTransient && attempts < maxAttempts) {
            const delay = Math.pow(2, attempts) * 1000 + Math.random() * 1000;
            logger.warn(
              `Model request failed with transient error ${statusCode}. Retrying in ${delay.toFixed(0)}ms...`,
              {
                provider: 'gemini',
                requestName,
                attempt: attempts,
              },
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }
          throw error;
        }
      }

      response = result.response;
    } catch (error) {
      this.handleRequestError(error, requestName);
    }

    const usage = toUsage(response.usageMetadata);

    logger.info('Model token usage.', {
      inputTokens: usage?.inputTokens,
      outputTokens: usage?.outputTokens,
      provider: 'gemini',
      requestName,
      totalTokens: usage?.totalTokens,
    });

    const text = toText(response);
    if (!text) {
      const hasCandidates = Boolean(response.candidates && response.candidates.length > 0);
      const hasParts = Boolean(
        response.candidates?.some((c) => c.content?.parts && c.content.parts.length > 0),
      );

      logger.error('Model provider returned an empty response.', {
        hasCandidates,
        hasParts,
        provider: 'gemini',
        requestName,
        responseKeys: Object.keys(response),
      });

      throw new ModelProviderError({
        code: 'PROVIDER_RESPONSE_EMPTY',
        message: 'Model provider returned an empty response.',
        retryable: true,
      });
    }

    return {
      finishReason: response.candidates?.[0]?.finishReason,
      text,
      usage,
    };
  }

  private handleRequestError(error: unknown, requestName?: string): never {
    const statusCode = toStatusCode(error);

    if (statusCode === 429) {
      logger.warn('Model provider rate limit reached.', {
        provider: 'gemini',
        requestName,
        statusCode,
        statusText: toStatusText(error),
      });

      throw new ModelProviderError({
        code: 'PROVIDER_RATE_LIMITED',
        message: 'Model provider rate limit reached. Please retry shortly.',
        retryable: true,
        statusCode,
      });
    }

    if (statusCode) {
      logger.error('Model provider request returned an error.', {
        provider: 'gemini',
        requestName,
        statusCode,
        statusText: toStatusText(error),
      });

      throw new ModelProviderError({
        code: 'PROVIDER_REQUEST_FAILED',
        message: 'Model provider request failed.',
        retryable: statusCode >= 500,
        statusCode,
      });
    }

    logger.error('Model provider request failed before receiving a response.', {
      provider: 'gemini',
      requestName,
    });

    throw new ModelProviderError({
      code: 'PROVIDER_REQUEST_FAILED',
      message: 'Model provider request failed.',
      retryable: true,
    });
  }
}
