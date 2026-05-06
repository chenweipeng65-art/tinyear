-- CreateTable
CREATE TABLE "listening_sessions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "childId" INTEGER NOT NULL,
    "teacherId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "title" TEXT NOT NULL,
    "observedAt" DATETIME NOT NULL,
    "ageBandAtSession" TEXT,
    "coverMediaId" INTEGER,
    "summarySnippet" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "listening_sessions_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "listening_sessions_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "session_contexts" (
    "sessionId" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "activityBackground" TEXT NOT NULL,
    "childBehavior" TEXT NOT NULL,
    "extraContext" TEXT,
    CONSTRAINT "session_contexts_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "listening_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_portfolio_archive_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "childId" INTEGER NOT NULL,
    "listeningSessionId" INTEGER,
    "title" TEXT NOT NULL,
    "displayDate" TEXT NOT NULL,
    "coverImageUrl" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "educationSuggestionPreview" TEXT NOT NULL,
    CONSTRAINT "portfolio_archive_items_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "portfolio_archive_items_listeningSessionId_fkey" FOREIGN KEY ("listeningSessionId") REFERENCES "listening_sessions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_portfolio_archive_items" ("childId", "coverImageUrl", "displayDate", "educationSuggestionPreview", "id", "listeningSessionId", "summary", "title") SELECT "childId", "coverImageUrl", "displayDate", "educationSuggestionPreview", "id", "listeningSessionId", "summary", "title" FROM "portfolio_archive_items";
DROP TABLE "portfolio_archive_items";
ALTER TABLE "new_portfolio_archive_items" RENAME TO "portfolio_archive_items";
CREATE UNIQUE INDEX "portfolio_archive_items_listeningSessionId_key" ON "portfolio_archive_items"("listeningSessionId");
CREATE INDEX "portfolio_archive_items_childId_idx" ON "portfolio_archive_items"("childId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "listening_sessions_childId_observedAt_idx" ON "listening_sessions"("childId", "observedAt");

-- CreateIndex
CREATE INDEX "listening_sessions_teacherId_status_idx" ON "listening_sessions"("teacherId", "status");
