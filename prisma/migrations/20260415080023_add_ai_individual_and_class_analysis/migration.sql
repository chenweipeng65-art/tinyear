-- CreateTable
CREATE TABLE "ai_individual_analyses" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "childId" INTEGER NOT NULL,
    "portfolioArchiveItemId" INTEGER,
    "listeningSessionId" INTEGER,
    "contentMarkdown" TEXT NOT NULL,
    "modelName" TEXT,
    "promptVersion" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_individual_analyses_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ai_individual_analyses_portfolioArchiveItemId_fkey" FOREIGN KEY ("portfolioArchiveItemId") REFERENCES "portfolio_archive_items" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ai_individual_analyses_listeningSessionId_fkey" FOREIGN KEY ("listeningSessionId") REFERENCES "listening_sessions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ai_class_analyses" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "classId" INTEGER NOT NULL,
    "title" TEXT,
    "periodNote" TEXT,
    "contentMarkdown" TEXT NOT NULL,
    "modelName" TEXT,
    "promptVersion" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_class_analyses_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ai_individual_analyses_childId_createdAt_idx" ON "ai_individual_analyses"("childId", "createdAt");

-- CreateIndex
CREATE INDEX "ai_individual_analyses_portfolioArchiveItemId_idx" ON "ai_individual_analyses"("portfolioArchiveItemId");

-- CreateIndex
CREATE INDEX "ai_individual_analyses_listeningSessionId_idx" ON "ai_individual_analyses"("listeningSessionId");

-- CreateIndex
CREATE INDEX "ai_class_analyses_classId_createdAt_idx" ON "ai_class_analyses"("classId", "createdAt");
