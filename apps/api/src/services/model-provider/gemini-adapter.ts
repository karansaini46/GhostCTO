import {
  GoogleGenerativeAI as GoogleProviderClient,
  SchemaType,
  type Schema,
} from '@google/generative-ai';
import { logger } from '../../lib/logger.js';
import { buildStructuredRetryPrompt } from '../prompts/index.js';
import { ModelProviderError } from './errors.js';
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
} from '@google/generative-ai';
import type { z, ZodType } from 'zod';

function zodToGeminiSchema(schema: any): Schema {
  let isNullable = false;
  let currentSchema = schema;
  while (currentSchema) {
    const typeName = currentSchema._def?.typeName;
    if (typeName === 'ZodNullable') {
      isNullable = true;
      currentSchema = currentSchema._def.schema || currentSchema._def.innerType;
    } else if (typeName === 'ZodOptional' || typeName === 'ZodEffects') {
      currentSchema = currentSchema._def.schema || currentSchema._def.innerType;
    } else {
      break;
    }
  }

  const typeName = currentSchema._def?.typeName;

  const result: Schema = (() => {
    switch (typeName) {
      case 'ZodString': {
        return { type: SchemaType.STRING };
      }
      case 'ZodNumber': {
        return { type: SchemaType.NUMBER };
      }
      case 'ZodBoolean': {
        return { type: SchemaType.BOOLEAN };
      }
      case 'ZodEnum': {
        return {
          type: SchemaType.STRING,
          enum: currentSchema._def.values,
        };
      }
      case 'ZodLiteral': {
        return {
          type: SchemaType.STRING,
          enum: [currentSchema._def.value],
        };
      }
      case 'ZodArray': {
        return {
          type: SchemaType.ARRAY,
          items: zodToGeminiSchema(currentSchema._def.type),
        };
      }
      case 'ZodObject': {
        const properties: Record<string, Schema> = {};
        const required: string[] = [];
        const shape =
          currentSchema.shape ||
          (typeof currentSchema._def.shape === 'function' ? currentSchema._def.shape() : {});

        for (const [key, value] of Object.entries(shape)) {
          properties[key] = zodToGeminiSchema(value);
          let isOptional = false;
          let checkVal: any = value;
          while (checkVal) {
            if (checkVal._def?.typeName === 'ZodOptional') {
              isOptional = true;
              break;
            }
            checkVal = checkVal._def?.schema || checkVal._def?.innerType;
          }
          if (!isOptional) {
            required.push(key);
          }
        }

        return {
          type: SchemaType.OBJECT,
          properties,
          required: required.length > 0 ? required : undefined,
        };
      }
      default: {
        return { type: SchemaType.STRING };
      }
    }
  })();

  if (isNullable) {
    result.nullable = true;
  }

  return result;
}

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
  schema?: ZodType;
};

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

const toText = (response: GeminiResponse) =>
  response.candidates
    ?.flatMap((candidate) => candidate.content?.parts ?? [])
    .map((part) => ('text' in part && typeof part.text === 'string' ? part.text : undefined))
    .filter((text): text is string => Boolean(text?.trim()))
    .join('\n')
    .trim() ?? '';

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
    const firstResult = await this.request({
      ...input,
      responseMimeType: 'application/json',
      schema: input.schema,
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
      schema: input.schema,
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
    schema,
    temperature,
  }: GeminiRequestOptions): Promise<GenerateTextResult> {
    let response: GeminiResponse;

    try {
      const modelNameResolved = this.modelName ?? resolveModelName(modelTier);
      const model = this.createModel(modelNameResolved);

      const generationConfig: Record<string, any> = {
        maxOutputTokens: maxOutputTokens ?? this.defaultMaxOutputTokens,
        responseMimeType,
        temperature: temperature ?? this.defaultTemperature,
      };

      if (schema && responseMimeType === 'application/json') {
        try {
          generationConfig.responseSchema = zodToGeminiSchema(schema);
        } catch (err) {
          logger.warn('Failed to convert Zod schema to Gemini schema', { err });
        }
      }

      const request: GenerateContentRequest = {
        contents: [
          {
            parts: [{ text: prompt }],
            role: 'user',
          },
        ],
        generationConfig,
      };

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
            logger.warn(`Model request failed with transient error ${statusCode}. Retrying in ${delay.toFixed(0)}ms...`, {
              provider: 'gemini',
              requestName,
              attempt: attempts,
            });
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
