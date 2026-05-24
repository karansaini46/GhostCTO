ALTER TABLE "GeneratedDocument" ADD COLUMN "version" INTEGER;

WITH ranked_documents AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "userId", "projectId", "type"
      ORDER BY "createdAt" ASC, "id" ASC
    ) AS "nextVersion"
  FROM "GeneratedDocument"
)
UPDATE "GeneratedDocument"
SET "version" = ranked_documents."nextVersion"
FROM ranked_documents
WHERE "GeneratedDocument"."id" = ranked_documents."id";

ALTER TABLE "GeneratedDocument" ALTER COLUMN "version" SET DEFAULT 1;
ALTER TABLE "GeneratedDocument" ALTER COLUMN "version" SET NOT NULL;

CREATE INDEX "GeneratedDocument_projectId_type_version_idx" ON "GeneratedDocument"("projectId", "type", "version");
