CREATE TYPE "GeneratedDocumentFeedbackUsefulness" AS ENUM ('USEFUL', 'NEEDS_WORK', 'WRONG');

CREATE TYPE "GeneratedDocumentFeedbackIssueType" AS ENUM ('MISSING_CONTEXT', 'INCORRECT_CONTENT', 'TOO_GENERIC', 'MISSING_DETAIL', 'HARD_TO_ACT_ON', 'OTHER');

CREATE TABLE "GeneratedDocumentFeedback" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "documentType" TEXT NOT NULL,
    "rating" SMALLINT NOT NULL,
    "usefulness" "GeneratedDocumentFeedbackUsefulness" NOT NULL,
    "issueType" "GeneratedDocumentFeedbackIssueType",
    "comment" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "GeneratedDocumentFeedback_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "GeneratedDocumentFeedback_rating_check" CHECK ("rating" BETWEEN 1 AND 3)
);

CREATE UNIQUE INDEX "GeneratedDocumentFeedback_documentId_userId_key" ON "GeneratedDocumentFeedback"("documentId", "userId");

CREATE INDEX "GeneratedDocumentFeedback_userId_idx" ON "GeneratedDocumentFeedback"("userId");

CREATE INDEX "GeneratedDocumentFeedback_projectId_idx" ON "GeneratedDocumentFeedback"("projectId");

CREATE INDEX "GeneratedDocumentFeedback_documentId_idx" ON "GeneratedDocumentFeedback"("documentId");

CREATE INDEX "GeneratedDocumentFeedback_documentType_idx" ON "GeneratedDocumentFeedback"("documentType");

CREATE INDEX "GeneratedDocumentFeedback_rating_idx" ON "GeneratedDocumentFeedback"("rating");

CREATE INDEX "GeneratedDocumentFeedback_createdAt_idx" ON "GeneratedDocumentFeedback"("createdAt");

ALTER TABLE "GeneratedDocumentFeedback" ADD CONSTRAINT "GeneratedDocumentFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GeneratedDocumentFeedback" ADD CONSTRAINT "GeneratedDocumentFeedback_projectId_userId_fkey" FOREIGN KEY ("projectId", "userId") REFERENCES "Project"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GeneratedDocumentFeedback" ADD CONSTRAINT "GeneratedDocumentFeedback_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "GeneratedDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
