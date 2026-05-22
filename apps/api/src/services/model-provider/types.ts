import type { z, ZodType } from 'zod';

export type ModelProviderUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

export type GenerateTextInput = {
  maxOutputTokens?: number;
  prompt: string;
  requestName?: string;
  temperature?: number;
};

export type GenerateTextResult = {
  finishReason?: string;
  text: string;
  usage?: ModelProviderUsage;
};

export type StructuredRetryDetails = {
  originalPrompt: string;
  previousText: string;
  requestName?: string;
  validationSummary: string;
};

export type GenerateStructuredInput<Schema extends ZodType> = GenerateTextInput & {
  retryPrompt?: (details: StructuredRetryDetails) => string;
  schema: Schema;
};

export type GenerateStructuredResult<Data> = GenerateTextResult & {
  attempts: number;
  data: Data;
};

export interface ModelProvider {
  generateStructured<Schema extends ZodType>(
    input: GenerateStructuredInput<Schema>,
  ): Promise<GenerateStructuredResult<z.infer<Schema>>>;
  generateText(input: GenerateTextInput): Promise<GenerateTextResult>;
}
