import bcrypt from 'bcryptjs';

const writeLine = (message: string) => {
  process.stdout.write(`${message}\n`);
};

const writeError = (error: unknown) => {
  const message = error instanceof Error ? (error.stack ?? error.message) : String(error);

  process.stderr.write(`${message}\n`);
};

const seed = async () => {
  if (process.env.NODE_ENV !== 'development') {
    writeLine('Seed skipped outside development.');
    return;
  }

  const { prisma } = await import('../src/infrastructure/database/prisma.js');

  try {
    const passwordHash = await bcrypt.hash('Password123!', 12);

    const user = await prisma.user.upsert({
      where: { email: 'founder@example.com' },
      update: {
        name: 'Test Founder',
        role: 'FOUNDER',
        passwordHash,
      },
      create: {
        email: 'founder@example.com',
        name: 'Test Founder',
        passwordHash,
        role: 'FOUNDER',
      },
    });

    await prisma.user.upsert({
      where: { email: 'admin12@gmail.com' },
      update: {
        name: 'Admin User 12',
        role: 'ADMIN',
        passwordHash,
      },
      create: {
        email: 'admin12@gmail.com',
        name: 'Admin User 12',
        passwordHash,
        role: 'ADMIN',
      },
    });

    await prisma.user.upsert({
      where: { email: 'admin@gmail.com' },
      update: {
        name: 'Admin User',
        role: 'ADMIN',
        passwordHash,
      },
      create: {
        email: 'admin@gmail.com',
        name: 'Admin User',
        passwordHash,
        role: 'ADMIN',
      },
    });

    await prisma.project.upsert({
      where: {
        userId_slug: {
          userId: user.id,
          slug: 'test-project',
        },
      },
      update: {
        companyName: 'Example Venture',
        name: 'Test Project',
        status: 'ACTIVE',
      },
      create: {
        userId: user.id,
        slug: 'test-project',
        name: 'Test Project',
        companyName: 'Example Venture',
        stage: 'Pre-seed',
        industry: 'Software',
        status: 'ACTIVE',
        context: {
          source: 'development-seed',
        },
      },
    });
  } finally {
    await prisma.$disconnect();
  }
};

seed().catch((error: unknown) => {
  writeError(error);
  process.exit(1);
});
