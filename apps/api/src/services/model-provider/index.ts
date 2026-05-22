import { config } from '../../core/config.js';
import { ModelProviderError } from './errors.js';
import { GeminiModelProvider } from './gemini-adapter.js';
import type { ModelProvider } from './types.js';

let provider: ModelProvider | null = null;

export const createConfiguredModelProvider = (): ModelProvider =>
  new GeminiModelProvider({
    apiKey: config.modelProviderApiKey,
    baseUrl: config.modelProviderBaseUrl,
    model: config.modelProviderModel,
  });

export const getModelProvider = () => {
  if (!provider) {
    provider = createConfiguredModelProvider();
  }

  return provider;
};

export const setModelProviderForTesting = (nextProvider: ModelProvider | null) => {
  if (config.isProduction) {
    throw new ModelProviderError({
      code: 'PROVIDER_REQUEST_FAILED',
      message: 'Provider override is not available in production.',
    });
  }

  provider = nextProvider;
};

export { ModelProviderError } from './errors.js';
export type {
  GenerateStructuredInput,
  GenerateStructuredResult,
  GenerateTextInput,
  GenerateTextResult,
  ModelProvider,
  ModelProviderUsage,
  StructuredRetryDetails,
} from './types.js';
