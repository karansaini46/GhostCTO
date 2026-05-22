const seed = async () => {
  if (process.env.NODE_ENV !== 'development') {
    console.info('Seed skipped outside development.');
    return;
  }

  const { prisma } = await import('../src/lib/prisma.js');

  try {
    const user = await prisma.user.upsert({
      where: { email: 'founder@example.com' },
      update: {
        name: 'Test Founder',
        role: 'FOUNDER',
      },
      create: {
        email: 'founder@example.com',
        name: 'Test Founder',
        role: 'FOUNDER',
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
  console.error(error);
  process.exit(1);
});
