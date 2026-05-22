-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('FOUNDER', 'ADMIN');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "WorkStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ChatMessageRole" AS ENUM ('FOUNDER', 'ADVISOR', 'SYSTEM');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('GUMROAD');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "avatarUrl" TEXT,
    "supabaseUserId" TEXT,
    "googleAccountId" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'FOUNDER',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyName" TEXT,
    "stage" TEXT,
    "industry" TEXT,
    "websiteUrl" TEXT,
    "summary" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "context" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectAnswer" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT,
    "answer" JSONB NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ProjectAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedDocument" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "projectId" UUID,
    "type" TEXT NOT NULL,
    "status" "WorkStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "content" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "completedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "GeneratedDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "projectId" UUID,
    "role" "ChatMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditReport" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "projectId" UUID,
    "type" TEXT NOT NULL,
    "status" "WorkStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "findings" JSONB NOT NULL DEFAULT '[]',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "completedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "AuditReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteAnalysis" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "projectId" UUID,
    "type" TEXT NOT NULL,
    "status" "WorkStatus" NOT NULL DEFAULT 'PENDING',
    "vendorName" TEXT,
    "quoteAmount" DECIMAL(12,2),
    "currency" VARCHAR(3),
    "summary" TEXT,
    "result" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "completedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "QuoteAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VettingReport" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "projectId" UUID,
    "type" TEXT NOT NULL,
    "status" "WorkStatus" NOT NULL DEFAULT 'PENDING',
    "subjectName" TEXT,
    "summary" TEXT,
    "criteria" JSONB NOT NULL DEFAULT '[]',
    "result" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "completedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "VettingReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "projectId" UUID,
    "type" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'GUMROAD',
    "providerPaymentId" TEXT NOT NULL,
    "providerCustomerId" TEXT,
    "providerProductId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "paidAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "revokedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_supabaseUserId_key" ON "User"("supabaseUserId");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleAccountId_key" ON "User"("googleAccountId");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE INDEX "Project_userId_idx" ON "Project"("userId");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "Project_createdAt_idx" ON "Project"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Project_id_userId_key" ON "Project"("id", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Project_userId_slug_key" ON "Project"("userId", "slug");

-- CreateIndex
CREATE INDEX "ProjectAnswer_userId_idx" ON "ProjectAnswer"("userId");

-- CreateIndex
CREATE INDEX "ProjectAnswer_projectId_idx" ON "ProjectAnswer"("projectId");

-- CreateIndex
CREATE INDEX "ProjectAnswer_type_idx" ON "ProjectAnswer"("type");

-- CreateIndex
CREATE INDEX "ProjectAnswer_createdAt_idx" ON "ProjectAnswer"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectAnswer_projectId_key_key" ON "ProjectAnswer"("projectId", "key");

-- CreateIndex
CREATE INDEX "GeneratedDocument_userId_idx" ON "GeneratedDocument"("userId");

-- CreateIndex
CREATE INDEX "GeneratedDocument_projectId_idx" ON "GeneratedDocument"("projectId");

-- CreateIndex
CREATE INDEX "GeneratedDocument_type_idx" ON "GeneratedDocument"("type");

-- CreateIndex
CREATE INDEX "GeneratedDocument_status_idx" ON "GeneratedDocument"("status");

-- CreateIndex
CREATE INDEX "GeneratedDocument_createdAt_idx" ON "GeneratedDocument"("createdAt");

-- CreateIndex
CREATE INDEX "ChatMessage_userId_idx" ON "ChatMessage"("userId");

-- CreateIndex
CREATE INDEX "ChatMessage_projectId_idx" ON "ChatMessage"("projectId");

-- CreateIndex
CREATE INDEX "ChatMessage_role_idx" ON "ChatMessage"("role");

-- CreateIndex
CREATE INDEX "ChatMessage_createdAt_idx" ON "ChatMessage"("createdAt");

-- CreateIndex
CREATE INDEX "AuditReport_userId_idx" ON "AuditReport"("userId");

-- CreateIndex
CREATE INDEX "AuditReport_projectId_idx" ON "AuditReport"("projectId");

-- CreateIndex
CREATE INDEX "AuditReport_type_idx" ON "AuditReport"("type");

-- CreateIndex
CREATE INDEX "AuditReport_status_idx" ON "AuditReport"("status");

-- CreateIndex
CREATE INDEX "AuditReport_createdAt_idx" ON "AuditReport"("createdAt");

-- CreateIndex
CREATE INDEX "QuoteAnalysis_userId_idx" ON "QuoteAnalysis"("userId");

-- CreateIndex
CREATE INDEX "QuoteAnalysis_projectId_idx" ON "QuoteAnalysis"("projectId");

-- CreateIndex
CREATE INDEX "QuoteAnalysis_type_idx" ON "QuoteAnalysis"("type");

-- CreateIndex
CREATE INDEX "QuoteAnalysis_status_idx" ON "QuoteAnalysis"("status");

-- CreateIndex
CREATE INDEX "QuoteAnalysis_createdAt_idx" ON "QuoteAnalysis"("createdAt");

-- CreateIndex
CREATE INDEX "VettingReport_userId_idx" ON "VettingReport"("userId");

-- CreateIndex
CREATE INDEX "VettingReport_projectId_idx" ON "VettingReport"("projectId");

-- CreateIndex
CREATE INDEX "VettingReport_type_idx" ON "VettingReport"("type");

-- CreateIndex
CREATE INDEX "VettingReport_status_idx" ON "VettingReport"("status");

-- CreateIndex
CREATE INDEX "VettingReport_createdAt_idx" ON "VettingReport"("createdAt");

-- CreateIndex
CREATE INDEX "Payment_userId_idx" ON "Payment"("userId");

-- CreateIndex
CREATE INDEX "Payment_projectId_idx" ON "Payment"("projectId");

-- CreateIndex
CREATE INDEX "Payment_type_idx" ON "Payment"("type");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_provider_providerPaymentId_key" ON "Payment"("provider", "providerPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");

-- CreateIndex
CREATE INDEX "RefreshToken_createdAt_idx" ON "RefreshToken"("createdAt");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAnswer" ADD CONSTRAINT "ProjectAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAnswer" ADD CONSTRAINT "ProjectAnswer_projectId_userId_fkey" FOREIGN KEY ("projectId", "userId") REFERENCES "Project"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_projectId_userId_fkey" FOREIGN KEY ("projectId", "userId") REFERENCES "Project"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_projectId_userId_fkey" FOREIGN KEY ("projectId", "userId") REFERENCES "Project"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditReport" ADD CONSTRAINT "AuditReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditReport" ADD CONSTRAINT "AuditReport_projectId_userId_fkey" FOREIGN KEY ("projectId", "userId") REFERENCES "Project"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteAnalysis" ADD CONSTRAINT "QuoteAnalysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteAnalysis" ADD CONSTRAINT "QuoteAnalysis_projectId_userId_fkey" FOREIGN KEY ("projectId", "userId") REFERENCES "Project"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VettingReport" ADD CONSTRAINT "VettingReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VettingReport" ADD CONSTRAINT "VettingReport_projectId_userId_fkey" FOREIGN KEY ("projectId", "userId") REFERENCES "Project"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
