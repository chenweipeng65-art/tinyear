-- AlterTable
ALTER TABLE "ai_individual_analyses" ADD COLUMN "exportPdfUrl" TEXT;
ALTER TABLE "ai_individual_analyses" ADD COLUMN "exportPdfCacheKey" TEXT;
ALTER TABLE "ai_class_analyses" ADD COLUMN "exportPdfUrl" TEXT;
ALTER TABLE "ai_class_analyses" ADD COLUMN "exportPdfCacheKey" TEXT;
