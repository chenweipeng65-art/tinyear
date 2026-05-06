-- CreateTable
CREATE TABLE "portfolio_archive_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "childId" INTEGER NOT NULL,
    "listeningSessionId" INTEGER,
    "title" TEXT NOT NULL,
    "displayDate" TEXT NOT NULL,
    "coverImageUrl" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "educationSuggestionPreview" TEXT NOT NULL,
    CONSTRAINT "portfolio_archive_items_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "portfolio_archive_items_childId_idx" ON "portfolio_archive_items"("childId");

-- CreateIndex
CREATE UNIQUE INDEX "portfolio_archive_items_listeningSessionId_key" ON "portfolio_archive_items"("listeningSessionId");
