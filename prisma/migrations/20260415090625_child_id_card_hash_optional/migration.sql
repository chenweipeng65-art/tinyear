-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_children" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "classId" INTEGER NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "idCardLastSixHash" TEXT,
    "ageBand" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "children_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_children" ("ageBand", "avatarUrl", "classId", "createdAt", "displayName", "id", "idCardLastSixHash", "notes", "updatedAt") SELECT "ageBand", "avatarUrl", "classId", "createdAt", "displayName", "id", "idCardLastSixHash", "notes", "updatedAt" FROM "children";
DROP TABLE "children";
ALTER TABLE "new_children" RENAME TO "children";
CREATE INDEX "children_classId_idx" ON "children"("classId");
CREATE UNIQUE INDEX "children_classId_displayName_key" ON "children"("classId", "displayName");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
