-- 合并 listening_sessions 入 portfolio_archive_items；删除 session_contexts；AI 表去掉 listeningSessionId

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

ALTER TABLE "portfolio_archive_items" RENAME TO "_old_portfolio_archive_items";

CREATE TABLE "portfolio_archive_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "childId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "title" TEXT NOT NULL,
    "observedAt" DATETIME NOT NULL,
    "displayDate" TEXT NOT NULL,
    "ageBandAtSession" TEXT,
    "coverMediaId" INTEGER,
    "childArtImageUrl" TEXT,
    "coverImageUrl" TEXT NOT NULL,
    "developmentAnalysisSnippet" TEXT,
    "summarySnippet" TEXT,
    "summary" TEXT NOT NULL,
    "educationSuggestionPreview" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "portfolio_archive_items_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "portfolio_archive_items" (
    "id",
    "childId",
    "status",
    "title",
    "observedAt",
    "displayDate",
    "ageBandAtSession",
    "coverMediaId",
    "childArtImageUrl",
    "coverImageUrl",
    "developmentAnalysisSnippet",
    "summarySnippet",
    "summary",
    "educationSuggestionPreview",
    "createdAt",
    "updatedAt"
)
SELECT
    p."id",
    p."childId",
    CASE WHEN s."id" IS NOT NULL THEN s."status" ELSE 'completed' END,
    CASE WHEN s."id" IS NOT NULL THEN s."title" ELSE p."title" END,
    COALESCE(s."observedAt", datetime(p."displayDate" || 'T12:00:00')),
    p."displayDate",
    s."ageBandAtSession",
    s."coverMediaId",
    s."childArtImageUrl",
    p."coverImageUrl",
    NULL,
    COALESCE(s."summarySnippet", substr(p."summary", 1, 160)),
    p."summary",
    p."educationSuggestionPreview",
    COALESCE(s."createdAt", CURRENT_TIMESTAMP),
    COALESCE(s."updatedAt", CURRENT_TIMESTAMP)
FROM "_old_portfolio_archive_items" AS p
LEFT JOIN "listening_sessions" AS s ON s."id" = p."listeningSessionId";

INSERT INTO "portfolio_archive_items" (
    "childId",
    "status",
    "title",
    "observedAt",
    "displayDate",
    "ageBandAtSession",
    "coverMediaId",
    "childArtImageUrl",
    "coverImageUrl",
    "developmentAnalysisSnippet",
    "summarySnippet",
    "summary",
    "educationSuggestionPreview",
    "createdAt",
    "updatedAt"
)
SELECT
    s."childId",
    s."status",
    s."title",
    s."observedAt",
    date(s."observedAt"),
    s."ageBandAtSession",
    s."coverMediaId",
    s."childArtImageUrl",
    COALESCE(NULLIF(s."childArtImageUrl", ''), ''),
    NULL,
    s."summarySnippet",
    COALESCE(NULLIF(s."summarySnippet", ''), ''),
    '',
    s."createdAt",
    s."updatedAt"
FROM "listening_sessions" AS s
WHERE s."id" NOT IN (
    SELECT p."listeningSessionId"
    FROM "_old_portfolio_archive_items" AS p
    WHERE p."listeningSessionId" IS NOT NULL
);

DROP TABLE "_old_portfolio_archive_items";

CREATE TABLE "_new_ai_individual_analyses" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "childId" INTEGER NOT NULL,
    "portfolioArchiveItemId" INTEGER,
    "contentMarkdown" TEXT NOT NULL,
    "modelName" TEXT,
    "promptVersion" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "_new_ai_individual_analyses_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_new_ai_individual_analyses_portfolioArchiveItemId_fkey" FOREIGN KEY ("portfolioArchiveItemId") REFERENCES "portfolio_archive_items" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "_new_ai_individual_analyses" (
    "id",
    "childId",
    "portfolioArchiveItemId",
    "contentMarkdown",
    "modelName",
    "promptVersion",
    "createdAt"
)
SELECT
    "id",
    "childId",
    "portfolioArchiveItemId",
    "contentMarkdown",
    "modelName",
    "promptVersion",
    "createdAt"
FROM "ai_individual_analyses";

DROP TABLE "ai_individual_analyses";
ALTER TABLE "_new_ai_individual_analyses" RENAME TO "ai_individual_analyses";

CREATE INDEX "ai_individual_analyses_childId_createdAt_idx" ON "ai_individual_analyses"("childId", "createdAt");
CREATE INDEX "ai_individual_analyses_portfolioArchiveItemId_idx" ON "ai_individual_analyses"("portfolioArchiveItemId");

DROP TABLE IF EXISTS "session_contexts";
DROP TABLE IF EXISTS "listening_sessions";

CREATE INDEX "portfolio_archive_items_childId_observedAt_idx" ON "portfolio_archive_items"("childId", "observedAt");
CREATE INDEX "portfolio_archive_items_childId_status_idx" ON "portfolio_archive_items"("childId", "status");
CREATE INDEX "portfolio_archive_items_childId_idx" ON "portfolio_archive_items"("childId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
