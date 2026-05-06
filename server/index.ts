/**
 * Express API：M1 `/api/health`；M2 只读业务路由（§2.4）。
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import express from "express";
import { prisma } from "./prisma.js";
import { registerActionRoutes } from "./routes/action.js";
import { registerAdminRoutes } from "./routes/admin.js";
import { registerMediaUploadRoutes } from "./routes/mediaUpload.js";
import { registerParentRoutes } from "./routes/parent.js";
import { registerReadRoutes } from "./routes/read.js";
import { registerTeacherChildArtAiRoutes } from "./routes/teacherChildArtAi.js";
import { registerTeacherListeningTextAiRoutes } from "./routes/teacherListeningTextAi.js";
import { registerTeacherPortfolioItemRoutes } from "./routes/teacherPortfolioItem.js";
import { registerTeacherAnalysisAiRoutes } from "./routes/teacherAnalysisAi.js";
import { registerTeacherAnalysisExportPdfRoutes } from "./routes/teacherAnalysisExportPdf.js";
import { registerTeacherListeningTranscribeRoutes } from "./routes/teacherListeningTranscribe.js";
import { registerTeacherLiveAssistantRoutes } from "./routes/teacherLiveAssistant.js";
import { ensureSeedOnBoot } from "./ensureSeedOnBoot.js";
import { backfillChildDisplayNameMasked } from "./backfillDisplayNameMasked.js";

const app = express();
app.use(express.json());

registerReadRoutes(app, prisma);
registerActionRoutes(app, prisma);
registerAdminRoutes(app, prisma);
registerParentRoutes(app, prisma);
registerMediaUploadRoutes(app, prisma);
registerTeacherChildArtAiRoutes(app, prisma);
registerTeacherListeningTextAiRoutes(app, prisma);
registerTeacherPortfolioItemRoutes(app, prisma);
registerTeacherAnalysisAiRoutes(app, prisma);
registerTeacherAnalysisExportPdfRoutes(app, prisma);
registerTeacherListeningTranscribeRoutes(app, prisma);
registerTeacherLiveAssistantRoutes(app);

app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, db: "connected" });
  } catch (err) {
    console.error("[api/health]", err);
    res.status(503).json({ ok: false, error: "database_unavailable" });
  }
});

if (process.env.NODE_ENV === "production") {
  const distPath = path.resolve(process.cwd(), "dist");
  const indexHtml = path.join(distPath, "index.html");
  if (fs.existsSync(indexHtml)) {
    app.use(express.static(distPath));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      res.sendFile(indexHtml);
    });
  }
}

const port = Number(process.env.API_PORT ?? 4741);
const listenHost = process.env.API_HOST ?? "0.0.0.0";

void (async () => {
  try {
    await ensureSeedOnBoot();
  } catch (err) {
    console.error("[boot] ensureSeedOnBoot 失败", err);
    process.exit(1);
  }
  try {
    await backfillChildDisplayNameMasked(prisma);
  } catch (err) {
    console.error("[boot] displayNameMasked 回填失败", err);
    process.exit(1);
  }

  const server = app.listen(port, listenHost, () => {
    console.log(
      `[api] listening on http://${listenHost}:${port} — … /api/parent/verify-login ; /api/admin/*`,
    );
  });
  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `[api] 端口 ${port} 已被占用（常见原因：已有一个 pnpm dev / dev:api 在运行）。请关掉旧终端里的 API，或在本项目 .env 里设置其他 API_PORT。`,
      );
    } else {
      console.error("[api] listen error", err);
    }
    process.exit(1);
  });
})();
