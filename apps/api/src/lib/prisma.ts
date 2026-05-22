import { PrismaPg } from '@prisma/adapter-pg';

import { config } from '../config.js';
import { PrismaClient } from '../generated/prisma/client.js';

const createPrismaClient = () => {
  if (!config.databaseUrl) {
    throw new Error('DATABASE_URL is required.');
  }

  const adapter = new PrismaPg({ connectionString: config.databaseUrl });

  return new PrismaClient({ adapter });
};

type PrismaClientInstance = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as typeof globalThis & {
  prismaClient?: PrismaClientInstance;
};

export const prisma = globalForPrisma.prismaClient ?? createPrismaClient();

if (!config.isProduction) {
  globalForPrisma.prismaClient = prisma;
}
