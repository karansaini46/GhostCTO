import type { SafeUser } from '../auth/auth-types';

export type BillingPlan = SafeUser['plan'];

export type BillingStatus = {
  access: {
    canCreateProject: boolean;
    canGenerate: boolean;
    canUseChat: boolean;
  };
  limits: {
    chatMessages: number;
    generations: number;
    projects: number;
  };
  plan: BillingPlan;
  usage: {
    chatMessages: number;
    generations: number;
    projects: number;
  };
};

export type PaymentRecord = {
  amountCents: number;
  createdAt: string;
  currency: string;
  id: string;
  paidAt: string | null;
  status: string;
  type: string;
  updatedAt: string;
};
