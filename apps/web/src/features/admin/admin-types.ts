export type AdminStats = {
  audits: number;
  documentFeedbackAverages: Array<{
    averageRating: number;
    documentType: string;
    feedbackCount: number;
  }>;
  generatedDocuments: number;
  payments: number;
  projects: number;
  quoteAnalyses: number;
  users: number;
};

export type AdminUserLookup = {
  counts: {
    audits: number;
    generatedDocuments: number;
    payments: number;
    projects: number;
    quoteAnalyses: number;
  };
  createdAt: string;
  email: string;
  id: string;
  name: string | null;
  plan: 'FREE' | 'LIFETIME';
  role: 'FOUNDER' | 'ADMIN';
  updatedAt: string;
};
