import type { Prisma } from '../../generated/prisma/client.js';
import type { BillingPlan, UserRole } from '../../generated/prisma/enums.js';
import { prisma } from '../../infrastructure/database/prisma.js';

export type AdminStats = {
  audits: number;
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
  plan: BillingPlan;
  role: UserRole;
  updatedAt: string;
};

const adminUserSelect = {
  _count: {
    select: {
      auditReports: true,
      documents: true,
      payments: true,
      projects: true,
      quoteAnalyses: true,
    },
  },
  createdAt: true,
  email: true,
  id: true,
  name: true,
  plan: true,
  role: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

const toAdminUserLookup = (
  user: Prisma.UserGetPayload<{ select: typeof adminUserSelect }>,
): AdminUserLookup => ({
  counts: {
    audits: user._count.auditReports,
    generatedDocuments: user._count.documents,
    payments: user._count.payments,
    projects: user._count.projects,
    quoteAnalyses: user._count.quoteAnalyses,
  },
  createdAt: user.createdAt.toISOString(),
  email: user.email,
  id: user.id,
  name: user.name,
  plan: user.plan,
  role: user.role,
  updatedAt: user.updatedAt.toISOString(),
});

export const getAdminStats = async (): Promise<AdminStats> => {
  const [users, projects, generatedDocuments, audits, quoteAnalyses, payments] =
    await prisma.$transaction([
      prisma.user.count(),
      prisma.project.count(),
      prisma.generatedDocument.count(),
      prisma.auditReport.count(),
      prisma.quoteAnalysis.count(),
      prisma.payment.count(),
    ]);

  return {
    audits,
    generatedDocuments,
    payments,
    projects,
    quoteAnalyses,
    users,
  };
};

export const lookupAdminUsersByEmail = async (email: string): Promise<AdminUserLookup[]> => {
  const user = await prisma.user.findUnique({
    select: adminUserSelect,
    where: { email },
  });

  return user ? [toAdminUserLookup(user)] : [];
};
