CREATE TYPE "BillingPlan" AS ENUM ('FREE', 'LIFETIME');

ALTER TABLE "User" ADD COLUMN "plan" "BillingPlan" NOT NULL DEFAULT 'FREE';

CREATE INDEX "User_plan_idx" ON "User"("plan");
