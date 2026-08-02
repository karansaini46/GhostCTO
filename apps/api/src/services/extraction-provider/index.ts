import { config } from '../../core/config.js';
import { ExtractionProviderError } from './errors.js';
import { OpenAICompatibleExtractionProvider } from './openai-adapter.js';

let provider: OpenAICompatibleExtractionProvider | null = null;

export const createConfiguredExtractionProvider = () =>
  new OpenAICompatibleExtractionProvider({
    apiKey: config.extractionProviderApiKey,
    baseUrl: config.extractionProviderBaseUrl,
    model: config.extractionProviderModel ?? 'gpt-4o-mini',
  });

export const getExtractionProvider = () => {
  if (!provider) {
    provider = createConfiguredExtractionProvider();
  }
  return provider;
};

export { ExtractionProviderError } from './errors.js';
export type { ExtractionProviderOptions } from './types.js';
