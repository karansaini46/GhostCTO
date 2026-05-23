export const freePlanLimits = {
  projects: 1,
} as const;

export const getPlanLabel = (plan: 'FREE' | 'LIFETIME' | null | undefined) =>
  plan === 'LIFETIME' ? 'Lifetime' : 'Free';
