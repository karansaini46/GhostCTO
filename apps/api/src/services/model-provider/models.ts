export const MODELS = {
  default: 'gemini-2.5-flash',
  quality: 'gemini-2.5-flash',
  pro: 'gemini-2.5-pro',
} as const;

export type ModelTier = keyof typeof MODELS;

export const resolveModelName = (tier: ModelTier = 'default') => MODELS[tier];
