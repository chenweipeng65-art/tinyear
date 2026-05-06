-- CreateTable
CREATE TABLE "ai_analysis_layers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sessionId" INTEGER NOT NULL,
    "analysisLayer" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "modelName" TEXT,
    "promptVersion" TEXT,
    "guideVersion" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_analysis_layers_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "listening_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "development_findings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sessionId" INTEGER NOT NULL,
    "domain" TEXT NOT NULL,
    "goalReference" TEXT NOT NULL,
    "levelJudgment" TEXT NOT NULL,
    "evidenceQuote" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "development_findings_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "listening_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ai_suggestions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sessionId" INTEGER NOT NULL,
    "audience" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_suggestions_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "listening_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "children" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "classId" INTEGER NOT NULL,
    "displayName" TEXT NOT NULL,
    "idCardLastSixHash" TEXT NOT NULL,
    "ageBand" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "children_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "export_jobs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sessionId" INTEGER,
    "childId" INTEGER,
    "format" TEXT NOT NULL,
    "templateId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "resultUrl" TEXT,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "export_jobs_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "listening_sessions" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "export_jobs_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

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
    CONSTRAINT "listening_sessions_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "listening_sessions_coverMediaId_fkey" FOREIGN KEY ("coverMediaId") REFERENCES "media_assets" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "session_contexts" (
    "sessionId" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "activityBackground" TEXT NOT NULL,
    "childBehavior" TEXT NOT NULL,
    "extraContext" TEXT,
    CONSTRAINT "session_contexts_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "listening_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sessionId" INTEGER NOT NULL,
    "mediaType" TEXT NOT NULL,
    "mediaSubtype" TEXT,
    "storageKey" TEXT NOT NULL,
    "publicUrl" TEXT,
    "mimeType" TEXT,
    "durationMs" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "media_assets_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "listening_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "utterances" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sessionId" INTEGER NOT NULL,
    "speaker" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "startMs" INTEGER,
    "endMs" INTEGER,
    "orderIndex" INTEGER NOT NULL,
    "sourceMediaId" INTEGER,
    "confidence" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "utterances_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "listening_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "utterances_sourceMediaId_fkey" FOREIGN KEY ("sourceMediaId") REFERENCES "media_assets" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "classes" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "gradeBand" TEXT NOT NULL,
    "schoolYear" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "teachers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "displayName" TEXT NOT NULL,
    "loginIdentifier" TEXT,
    "passwordHash" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "portfolio_archive_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "childId" INTEGER NOT NULL,
    "listeningSessionId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "displayDate" TEXT NOT NULL,
    "coverImageUrl" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "educationSuggestionPreview" TEXT NOT NULL,
    CONSTRAINT "portfolio_archive_items_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "portfolio_archive_items_listeningSessionId_fkey" FOREIGN KEY ("listeningSessionId") REFERENCES "listening_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "teacher_reflections" (
    "sessionId" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "trulyListened" TEXT NOT NULL,
    "responsePromotedExpression" TEXT NOT NULL,
    "howToImprove" TEXT NOT NULL,
    "extraNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "teacher_reflections_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "listening_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "realtime_assist_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sessionId" INTEGER NOT NULL,
    "suggestionText" TEXT NOT NULL,
    "contextSnippet" TEXT,
    "source" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "realtime_assist_logs_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "listening_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "share_links" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "childId" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "shareScope" TEXT NOT NULL,
    "sessionId" INTEGER,
    "expiresAt" DATETIME NOT NULL,
    "revokedAt" DATETIME,
    "maxAccessCount" INTEGER,
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "share_links_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "share_links_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "listening_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ai_analysis_layers_sessionId_analysisLayer_idx" ON "ai_analysis_layers"("sessionId", "analysisLayer");

-- CreateIndex
CREATE UNIQUE INDEX "ai_analysis_layers_sessionId_analysisLayer_key" ON "ai_analysis_layers"("sessionId", "analysisLayer");

-- CreateIndex
CREATE INDEX "development_findings_sessionId_idx" ON "development_findings"("sessionId");

-- CreateIndex
CREATE INDEX "ai_suggestions_sessionId_audience_idx" ON "ai_suggestions"("sessionId", "audience");

-- CreateIndex
CREATE INDEX "children_classId_idx" ON "children"("classId");

-- CreateIndex
CREATE UNIQUE INDEX "children_classId_displayName_key" ON "children"("classId", "displayName");

-- CreateIndex
CREATE UNIQUE INDEX "listening_sessions_coverMediaId_key" ON "listening_sessions"("coverMediaId");

-- CreateIndex
CREATE INDEX "listening_sessions_childId_observedAt_idx" ON "listening_sessions"("childId", "observedAt");

-- CreateIndex
CREATE INDEX "listening_sessions_teacherId_status_idx" ON "listening_sessions"("teacherId", "status");

-- CreateIndex
CREATE INDEX "media_assets_sessionId_mediaType_idx" ON "media_assets"("sessionId", "mediaType");

-- CreateIndex
CREATE INDEX "utterances_sessionId_orderIndex_idx" ON "utterances"("sessionId", "orderIndex");

-- CreateIndex
CREATE INDEX "classes_gradeBand_idx" ON "classes"("gradeBand");

-- CreateIndex
CREATE UNIQUE INDEX "teachers_loginIdentifier_key" ON "teachers"("loginIdentifier");

-- CreateIndex
CREATE UNIQUE INDEX "portfolio_archive_items_listeningSessionId_key" ON "portfolio_archive_items"("listeningSessionId");

-- CreateIndex
CREATE INDEX "portfolio_archive_items_childId_idx" ON "portfolio_archive_items"("childId");

-- CreateIndex
CREATE INDEX "realtime_assist_logs_sessionId_createdAt_idx" ON "realtime_assist_logs"("sessionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "share_links_token_key" ON "share_links"("token");

-- CreateIndex
CREATE INDEX "share_links_token_idx" ON "share_links"("token");

-- CreateIndex
CREATE INDEX "share_links_childId_idx" ON "share_links"("childId");
