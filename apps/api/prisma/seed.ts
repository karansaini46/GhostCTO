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

    const project = await prisma.project.upsert({
      where: {
        userId_slug: {
          userId: user.id,
          slug: 'test-project',
        },
      },
      update: {
        companyName: 'Example Venture',
        name: 'Test Project',
        ideaSummary: 'A founder operations workspace that helps early teams compare vendor proposals, document product scope, and make confident budget decisions before hiring technical help.',
        targetCustomer: 'Non-technical startup founders comparing contractors or agencies while trying to protect runway and avoid unclear delivery commitments.',
        biggestConcern: 'The largest risk is paying for a broad build before customers validate the first workflow.',
        industry: 'B2B operations',
        productType: 'saas',
        monetization: 'subscription',
        currentStage: 'validating',
        budgetRange: '15000_50000',
        launchTimeline: '8_to_12_weeks',
        founderTechnicalLevel: 'non_technical',
        existingAssets: ['customer_interviews'],
        mustHaveFeatures: [
          'Founder uploads vendor proposals and sees major scope risks before signing.',
          'Team tracks launch-critical features with enough detail for delivery planning.',
          'Founder exports a concise decision memo for advisors and contractors.',
        ],
        status: 'ACTIVE',
        context: {
          onboardingCompletedAt: new Date().toISOString(),
          onboardingVersion: 1,
        },
      },
      create: {
        userId: user.id,
        slug: 'test-project',
        name: 'Test Project',
        companyName: 'Example Venture',
        stage: 'validating',
        ideaSummary: 'A founder operations workspace that helps early teams compare vendor proposals, document product scope, and make confident budget decisions before hiring technical help.',
        targetCustomer: 'Non-technical startup founders comparing contractors or agencies while trying to protect runway and avoid unclear delivery commitments.',
        biggestConcern: 'The largest risk is paying for a broad build before customers validate the first workflow.',
        industry: 'B2B operations',
        productType: 'saas',
        monetization: 'subscription',
        currentStage: 'validating',
        budgetRange: '15000_50000',
        launchTimeline: '8_to_12_weeks',
        founderTechnicalLevel: 'non_technical',
        existingAssets: ['customer_interviews'],
        mustHaveFeatures: [
          'Founder uploads vendor proposals and sees major scope risks before signing.',
          'Team tracks launch-critical features with enough detail for delivery planning.',
          'Founder exports a concise decision memo for advisors and contractors.',
        ],
        status: 'ACTIVE',
        context: {
          onboardingCompletedAt: new Date().toISOString(),
          onboardingVersion: 1,
        },
      },
    });

    const answersData = [
      { key: 'name', label: 'Project name', answer: 'Test Project', step: 'foundation' },
      { key: 'ideaSummary', label: 'Idea summary', answer: 'A founder operations workspace that helps early teams compare vendor proposals, document product scope, and make confident budget decisions before hiring technical help.', step: 'foundation' },
      { key: 'targetCustomer', label: 'Target customer', answer: 'Non-technical startup founders comparing contractors or agencies while trying to protect runway and avoid unclear delivery commitments.', step: 'foundation' },
      { key: 'industry', label: 'Industry', answer: 'B2B operations', step: 'market' },
      { key: 'productType', label: 'Product type', answer: 'saas', step: 'market' },
      { key: 'monetization', label: 'Monetization', answer: 'subscription', step: 'market' },
      { key: 'currentStage', label: 'Current stage', answer: 'validating', step: 'execution' },
      { key: 'budgetRange', label: 'Budget range', answer: '15000_50000', step: 'execution' },
      { key: 'launchTimeline', label: 'Launch timeline', answer: '8_to_12_weeks', step: 'execution' },
      { key: 'founderTechnicalLevel', label: 'Founder technical level', answer: 'non_technical', step: 'execution' },
      { key: 'existingAssets', label: 'Existing assets', answer: ['customer_interviews'], step: 'context' },
      { key: 'mustHaveFeatures', label: 'Must-have features', answer: [
        'Founder uploads vendor proposals and sees major scope risks before signing.',
        'Team tracks launch-critical features with enough detail for delivery planning.',
        'Founder exports a concise decision memo for advisors and contractors.',
      ], step: 'context' },
      { key: 'biggestConcern', label: 'Biggest concern', answer: 'The largest risk is paying for a broad build before customers validate the first workflow.', step: 'context' },
    ];

    for (const ans of answersData) {
      await prisma.projectAnswer.upsert({
        where: {
          projectId_key: {
            projectId: project.id,
            key: ans.key,
          },
        },
        update: {
          answer: ans.answer,
          label: ans.label,
          type: 'project_onboarding',
          metadata: {
            onboardingVersion: 1,
            step: ans.step,
          },
        },
        create: {
          userId: user.id,
          projectId: project.id,
          key: ans.key,
          label: ans.label,
          answer: ans.answer,
          type: 'project_onboarding',
          metadata: {
            onboardingVersion: 1,
            step: ans.step,
          },
        },
      });
    }

    const mockDocuments = [
      {
        type: 'roadmap',
        title: 'Technical Development Roadmap',
        summary: 'Milestones, MVP scope, and architectural sequence for the initial development phases.',
        content: `# Technical Development Roadmap\n\n## Phase 1: MVP Core Foundation (Weeks 1-4)\nFocuses on establishing the database schema, user authentication, and basic workspace features.\n- **Milestone 1**: Database setup and auth flow integration.\n- **Milestone 2**: Core document generation forms and workspace persistence.\n\n## Phase 2: AI Enhancements & Export (Weeks 5-8)\nFocuses on integrating the LLM advisor engines and exporting generated documents.\n- **Milestone 3**: Integration with Gemini API.\n- **Milestone 4**: PDF/Markdown export rendering.\n\n## Phase 3: Launch & Billing (Weeks 9-12)\nFocuses on billing flows, landing pages, and production hardening.\n- **Milestone 5**: Gumroad payment integration.\n- **Milestone 6**: Production deployment and analytics setup.`,
        metadata: {},
      },
      {
        type: 'stack_advisor',
        title: 'Technology Stack Recommendation',
        summary: 'Curated backend, frontend, infrastructure, and tool advice for B2B operations.',
        content: `# Technology Stack Recommendation\n\n## Frontend Framework\n- **Option**: Next.js with React 19 and Tailwind CSS.\n- **Rationale**: Server-side rendering, SEO-friendly, and quick development speed.\n\n## Backend & API\n- **Option**: Express.js with Node 22 and TypeScript.\n- **Rationale**: Fast lightweight JSON APIs, simple monorepo integration, and robust ecosystem.\n\n## Database & ORM\n- **Option**: PostgreSQL with Prisma ORM.\n- **Rationale**: Strong relational schema validation, robust migration history, and easy query builders.\n\n## Infrastructure & Hosting\n- **Option**: Render or Vercel.\n- **Rationale**: Minimal DevOps, automated git-based deployments, and cost-effective scaling.`,
        metadata: {
          stackAdvice: {
            moduleType: 'STACK_ADVICE',
            recommendation: 'Use a standard, battle-tested modern web stack.',
            teamAssumption: '1-2 Full Stack Engineers',
            scaleView: 'Startup MVP supporting 10k-50k users',
            executiveSummary: 'For a B2B SaaS startup, prioritize time-to-market and simple operations. Next.js, Express, PostgreSQL, and Render provide the best balance of speed, cost, and developer familiarity.',
            reportMarkdown: '# Technology Stack Recommendation\n\nSee recommendations below.',
            assumptions: [
              { text: 'Team consists of 1-2 Full Stack developers.', reason: 'Standard startup seed staffing.' }
            ],
            cards: [
              { title: 'Complexity', value: 'Low', tone: 'positive' },
              { title: 'Monthly Cost', value: '$100', tone: 'accent' }
            ],
            categories: [
              {
                category: 'frontend',
                recommendation: 'Next.js with React 19',
                founderExplanation: 'Fast, modern, and SEO friendly out of the box.',
                whyItFits: 'Great starter templates and fast rendering.',
                commonAlternative: 'Single Page React App',
                whyNotCommonAlternative: 'Too much configuration for routing, layout, and SEO.',
                costRisk: 'Low cost risk.',
                costRiskLevel: 'low',
                operationalComplexity: 'Simple hosting.',
                operationalComplexityLevel: 'low'
              },
              {
                category: 'backend',
                recommendation: 'Express.js with Node 22',
                founderExplanation: 'Fast lightweight API framework.',
                whyItFits: 'Universal JavaScript enables front-back code sharing.',
                commonAlternative: 'Python Django',
                whyNotCommonAlternative: 'Slower initial setup and team needs dual language skills.',
                costRisk: 'None.',
                costRiskLevel: 'low',
                operationalComplexity: 'Very simple.',
                operationalComplexityLevel: 'low'
              },
              {
                category: 'database',
                recommendation: 'PostgreSQL',
                founderExplanation: 'Robust relational database.',
                whyItFits: 'Perfect for ACID transactions and structured data models.',
                commonAlternative: 'MongoDB',
                whyNotCommonAlternative: 'Document store lacks enforced relations for complex entities.',
                costRisk: 'Scales linearly with pricing plans.',
                costRiskLevel: 'low',
                operationalComplexity: 'Fully managed services like Supabase or RDS.',
                operationalComplexityLevel: 'low'
              }
            ],
            risks: [
              {
                risk: 'Scaling limits on cheap hosting databases.',
                impact: 'Slow database response times.',
                mitigation: 'Configure indexes early and setup PgBouncer.'
              }
            ],
            nextSteps: [
              { action: 'Initialize repository using Next.js starter pack.', reason: 'Kickstart development.' }
            ]
          }
        },
      },
      {
        type: 'technical_spec',
        title: 'Product Technical Specification',
        summary: 'Detailed system architecture, database models, API specs, and feature requirements.',
        content: `# Product Technical Specification\n\n## Core Data Schema\nDetailed database models for Users, Projects, and Generated Documents:\n- **User**: Authentication credentials, roles (Founder vs Admin), and subscription plans.\n- **Project**: Basic details, onboarding responses, and settings.\n- **GeneratedDocument**: Title, type, markdown content, and feedback relations.\n\n## System Architecture\n- Client-server architecture with client side single-page application and backend REST API.\n- Secure session tokens passed via Bearer auth headers.`,
        metadata: {
          technicalSpec: {
            moduleType: 'technical_spec',
            reportMarkdown: '# Product Technical Specification\n\nSee sections below.',
            featureOverview: 'User onboarding, subscription billing, proposal uploading, and PDF document exports.',
            userStories: [
              {
                id: 'US-1',
                title: 'Onboarding Wizard',
                story: 'As a founder, I want to answer onboarding questions so the system customizes advisor outputs.',
                acceptanceCriteria: [
                  'Saves intermediate progress on step change.',
                  'Redirects to dashboard upon completion.'
                ]
              }
            ],
            apiEndpoints: [
              {
                method: 'POST',
                path: '/api/projects',
                description: 'Create a new project workspace.',
                requestBody: '{ name: string, budgetRange: string }',
                successResponse: '201 Created with project JSON.'
              }
            ],
            databaseChanges: [
              {
                table: 'Project',
                action: 'CREATE',
                description: 'Store all project details and settings.'
              }
            ],
            edgeCases: [
              {
                case: 'User logs out mid-onboarding.',
                impact: 'Intermediate draft project is kept.',
                mitigation: 'Auto-resume onboarding when logging in again.'
              }
            ],
            testCases: [
              {
                id: 'TC-1',
                scenario: 'Successful onboarding submission',
                steps: ['Fill all form inputs', 'Click submit'],
                expectedResult: 'Redirects to /projects/:id and database inserts records.'
              }
            ],
            implementationSequence: [
              {
                phase: 'Phase 1',
                tasks: ['Configure Postgres schema and generate Prisma clients.']
              }
            ]
          }
        },
      },
      {
        type: 'developer_jd',
        title: 'Developer Job Description & Screening Guide',
        summary: 'Briefing document, screening questions, and job description for a Senior Full Stack Engineer.',
        content: `# Senior Full-Stack Developer Job Description\n\n## Role Overview\nWe are looking for a Senior Full-Stack Engineer (React, Node.js, PostgreSQL) to own the MVP development and scale the initial platform architecture.\n\n## Responsibilities\n- Implement clean, responsive UI layouts based on design specifications.\n- Develop robust, tested backend API endpoints and integrate third-party APIs.\n- Write modular, well-documented code in a shared monorepo workspace.`,
        metadata: {},
      },
      {
        type: 'rate_validator',
        title: 'Vendor Rate and Proposal Validation',
        summary: 'Comparative analysis of vendor proposals, hourly rates, and timeline estimation.',
        content: `# Vendor Proposal Validation Report\n\n## Cost Assessment\n- **Proposed Rate**: $85/hour.\n- **Market Average**: $70 - $90/hour for Senior Developer.\n- **Verdict**: Fair, matches mid-to-high market standard.\n\n## Scope Risks\n- The estimate does not specify test coverage requirements.\n- The timeline is dependent on prompt asset assets handoff from our team.`,
        metadata: {
          quoteAnalysis: {
            moduleType: 'quote_analysis',
            reportMarkdown: '# Vendor Proposal Validation Report\n\nSee assessment below.',
            riskScore: 2,
            priceFairnessVerdict: 'The proposal cost is within the average market range.',
            timelineRealism: '12 weeks is realistic provided design assets are delivered on time.',
            missingDeliverables: [
              'No automated testing coverage specified.',
              'Post-launch security patches and maintenance details are missing.'
            ],
            questionsToAskDeveloper: [
              'What is the expected test coverage percentage?',
              'How will database backups and hot-swaps be configured?'
            ],
            negotiationScript: 'Hi team, we reviewed the proposal. It looks solid, but we noticed there are no details on post-launch maintenance or automated testing. Can we include a basic SLA for security patches?'
          }
        },
      },
      {
        type: 'code_audit',
        title: 'Repository Technical Code Audit',
        summary: 'Security, performance, and best practice audit of the repository.',
        content: `# Repository Technical Code Audit\n\n## Code Quality & Architecture\n- **Strength**: Strong type-safety with TypeScript, consistent code style enforced by Prettier/ESLint.\n- **Improvement**: Add unified error handling middleware across all Express routes.\n\n## Performance\n- Database queries should use indexed fields to prevent slow table scans as the dataset grows.`,
        metadata: {
          codeAudit: {
            moduleType: 'code_audit',
            reportMarkdown: '# Repository Technical Code Audit\n\nSee audit results below.',
            executiveSummary: 'The repository is well organized as a PNPM monorepo with good TypeScript typing and formatting rules. The key risk areas are query performance on large tables.',
            disclaimer: 'This audit is based on static analysis of the source code and does not represent a full penetration test.',
            recommendation: 'Add indexes to foreign key columns and implement global API error handling.',
            findings: [
              {
                id: 'F-1',
                title: 'Missing index on Project(userId)',
                severity: 'high',
                category: 'performance',
                description: 'Listing projects for a user performs a full table scan without an index.',
                recommendation: 'Add @@index([userId]) to the Project model in schema.prisma.'
              }
            ],
            questionsForDeveloper: [
              'Why are soft deletes not implemented on Projects?'
            ],
            recommendedNextActions: [
              { action: 'Update schema.prisma and run prisma migrate.', priority: 'high' }
            ],
            acceptableAreas: [
              { area: 'TypeScript type safety', notes: 'No use of ' + "'any' types in core services." }
            ]
          }
        },
      },
      {
        type: 'vetting_scorecard',
        title: 'Developer Interview & Vetting Scorecard',
        summary: 'Technical vetting scorecard with standard assessment rubrics.',
        content: `# Technical Candidate Vetting Scorecard\n\n## Vetting Categories\n\n### 1. Architectural Reasoning\n- **Score**: 4/5\n- **Notes**: Candidate understands monorepo structures, data normalization, and query tuning.\n\n### 2. Frontend Proficiency\n- **Score**: 5/5\n- **Notes**: Strong CSS layout capabilities, clean component splitting, and performance optimization.`,
        metadata: {
          vettingScorecard: {
            moduleType: 'vetting_scorecard',
            recommendation: 'Strong Hire - proceed to final round.',
            overallScore: 4.5,
            overallScoreReasoning: 'Candidate demonstrated strong backend query tuning, responsive UI design capabilities, and good communication skills.',
            finalRecommendation: 'Hire as Senior Full-Stack developer.',
            criteria: [
              {
                category: 'Architectural Design',
                score: 4,
                maxScore: 5,
                evidence: 'Successfully explained database partitioning and read replicas.',
                notes: 'Excellent depth.'
              }
            ],
            redFlags: [
              { flag: 'Lack of experience with WebSockets.', severity: 'medium', notes: 'Not critical for current roadmap.' }
            ],
            missingProof: [
              'Did not see active live URLs of past Next.js production deployments.'
            ],
            interviewQuestions: [
              {
                question: 'How do you handle API security and token invalidation on the client?',
                intent: 'Verify understanding of JWT auth flow.'
              }
            ],
            nextSteps: [
              { action: 'Schedule cultural fit interview.', notes: 'Final step before offer.' }
            ]
          }
        },
      },
    ];

    await prisma.generatedDocument.deleteMany({
      where: {
        projectId: project.id,
      },
    });

    for (const doc of mockDocuments) {
      await prisma.generatedDocument.create({
        data: {
          userId: user.id,
          projectId: project.id,
          type: doc.type,
          title: doc.title,
          summary: doc.summary,
          content: doc.content,
          status: 'COMPLETED',
          version: 1,
          completedAt: new Date(),
          metadata: doc.metadata ?? {},
        },
      });
    }
  } finally {
    await prisma.$disconnect();
  }
};

seed().catch((error: unknown) => {
  writeError(error);
  process.exit(1);
});
