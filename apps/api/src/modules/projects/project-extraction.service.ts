import { ApiError } from '../../lib/api-error.js';
import { logger } from '../../lib/logger.js';
import { ExtractionProviderError, getExtractionProvider } from '../../services/extraction-provider/index.js';
import { extractContextResultSchema, type ExtractContextResult } from './project.schemas.js';

export async function extractProjectContext(description: string): Promise<ExtractContextResult> {
  const provider = getExtractionProvider();

  const prompt = `Extract structured project context from the founder's description below. Return a JSON object with exactly these keys:

- ideaSummary: A clear 2–3 sentence summary of what the product does (string, or null if unclear)
- targetCustomer: Who the primary customer is, described specifically (string, or null if unclear)
- industry: The closest industry or category (string, or null if unclear)
- productType: One of: saas, marketplace, consumer_app, internal_tool, commerce, community, content, services, hardware_enabled (string, or null if cannot determine)
- monetization: One of: subscription, transaction_fee, one_time_purchase, services, freemium, licensing, not_decided (string, or null if cannot determine)
- currentStage: One of: idea, validating, prototype, mvp, beta, launched, scaling (string, or null if cannot determine)
- mustHaveFeatures: Array of 3–6 strings, each describing a specific launch-critical feature (array, or null if insufficient detail)

Return null for any field you cannot confidently determine from the description.

Founder description:
${description}`;

  try {
    const jsonString = await provider.extractJson(prompt);
    const parsed = JSON.parse(jsonString);
    const validationResult = extractContextResultSchema.safeParse(parsed);

    if (!validationResult.success) {
      return {
        ideaSummary: null,
        targetCustomer: null,
        industry: null,
        productType: null,
        monetization: null,
        currentStage: null,
        mustHaveFeatures: null,
      };
    }

    return validationResult.data;
  } catch (error) {
    if (error instanceof ExtractionProviderError && error.code === 'PROVIDER_NOT_CONFIGURED') {
      throw new ApiError(503, 'EXTRACTION_PROVIDER_NOT_CONFIGURED', 'Extraction provider is not configured.');
    }

    logger.warn('Extraction provider error during context extraction', { error });

    return {
      ideaSummary: null,
      targetCustomer: null,
      industry: null,
      productType: null,
      monetization: null,
      currentStage: null,
      mustHaveFeatures: null,
    };
  }
}
