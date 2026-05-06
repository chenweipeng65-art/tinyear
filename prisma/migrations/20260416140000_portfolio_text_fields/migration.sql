-- 去掉封面 URL（并入 childArtImageUrl）；educationSuggestionPreview → parentGuidanceAdvice；新增各文本落库字段

ALTER TABLE "portfolio_archive_items" ADD COLUMN "recordingTranscript" TEXT NOT NULL DEFAULT '';
ALTER TABLE "portfolio_archive_items" ADD COLUMN "analysisInterpretation" TEXT NOT NULL DEFAULT '';
ALTER TABLE "portfolio_archive_items" ADD COLUMN "teacherSupportStrategies" TEXT NOT NULL DEFAULT '';
ALTER TABLE "portfolio_archive_items" ADD COLUMN "parentGuidanceAdvice" TEXT NOT NULL DEFAULT '';
ALTER TABLE "portfolio_archive_items" ADD COLUMN "teacherReflection" TEXT NOT NULL DEFAULT '';

UPDATE "portfolio_archive_items"
SET "parentGuidanceAdvice" = "educationSuggestionPreview";

UPDATE "portfolio_archive_items"
SET "childArtImageUrl" = "coverImageUrl"
WHERE ("childArtImageUrl" IS NULL OR TRIM(COALESCE("childArtImageUrl", '')) = '')
  AND "coverImageUrl" IS NOT NULL
  AND TRIM("coverImageUrl") != '';

-- SQLite 3.35+ DROP COLUMN
ALTER TABLE "portfolio_archive_items" DROP COLUMN "coverImageUrl";
ALTER TABLE "portfolio_archive_items" DROP COLUMN "educationSuggestionPreview";
