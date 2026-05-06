/*
  Warnings:

  - You are about to drop the `ai_analysis_layers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ai_suggestions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `development_findings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `export_jobs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `listening_sessions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `media_assets` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `portfolio_archive_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `realtime_assist_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `session_contexts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `share_links` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `teacher_reflections` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `utterances` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ai_analysis_layers";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ai_suggestions";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "development_findings";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "export_jobs";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "listening_sessions";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "media_assets";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "portfolio_archive_items";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "realtime_assist_logs";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "session_contexts";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "share_links";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "teacher_reflections";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "utterances";
PRAGMA foreign_keys=on;
