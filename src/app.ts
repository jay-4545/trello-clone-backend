// src/app.ts
import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import compression from "compression";
import morgan from "morgan";

import { corsOptions } from "./config/cors";
import { globalLimiter } from "./middleware/rate-limit";
import {
  helmetMiddleware,
  requestId,
  sanitizeBody,
  sanitizeQuery,
  preventParamPollution,
} from "./middleware/security.middleware";
import { errorMiddleware } from "./middleware/error.middleware";
import { sendSuccess, sendNotFound } from "./utils/response";
import env from "./config/env";
import logger from "./utils/logger";

// ─── Route modules ────────────────────────────────────────────────────────────
import authRoutes from "./modules/auth/auth.routes";
import { adminRouter } from "./modules/admin/admin.controller";
import notificationRoutes from "./modules/notification/notification.routes";
import workspaceRoutes from "./modules/workspace/workspace.routes";
import boardRoutes from "./modules/board/board.routes";
import listRoutes from "./modules/list/list.routes";
import cardRoutes from "./modules/card/card.routes";
import commentRoutes from "./modules/comment/comment.routes";
import todoRoutes from "./modules/todo/todo.routes";

const app = express();

// ─── 1. Trust proxy (nginx / load balancer / Render) ──────────────────────────
app.set("trust proxy", 1);

// ─── 2. Security headers ──────────────────────────────────────────────────────
app.use(helmetMiddleware);

// ─── 3. Request ID + timing ───────────────────────────────────────────────────
app.use(requestId);

// ─── 4. Response compression ──────────────────────────────────────────────────
app.use(compression());

// ─── 5. HTTP request logging ──────────────────────────────────────────────────
if (env.NODE_ENV !== "test") {
  app.use(
    morgan("combined", {
      stream: { write: (msg) => logger.info(msg.trim()) },
      skip: (_req, res) => res.statusCode < 400 && env.NODE_ENV === "production",
    })
  );
}

// ─── 6. CORS ──────────────────────────────────────────────────────────────────
app.use(cors(corsOptions));

// ─── 7. Global rate limiter ───────────────────────────────────────────────────
app.use(globalLimiter());

// ─── 8. Body parsing ─────────────────────────────────────────────────────────
app.use(express.json({ limit: env.MAX_REQUEST_BODY_SIZE }));
app.use(express.urlencoded({ extended: true, limit: env.MAX_REQUEST_BODY_SIZE }));

// ─── 9. Input sanitization ───────────────────────────────────────────────────
app.use(sanitizeBody);
app.use(sanitizeQuery);
app.use(preventParamPollution);

// ─── 10. Health / readiness checks ───────────────────────────────────────────
app.get("/health", (_req: Request, res: Response) => {
  sendSuccess(res, "OK", {
    status: "healthy",
    version: "2.0.0",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    pid: process.pid,
  });
});

app.get("/ready", async (_req: Request, res: Response) => {
  sendSuccess(res, "Ready");
});

// ─── 11. API Routes ───────────────────────────────────────────────────────────
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/todos", todoRoutes);

// Workspace-scoped nested routes
app.use("/api/v1/workspaces", workspaceRoutes);
app.use("/api/v1/workspaces/:workspaceId/boards", boardRoutes);
app.use("/api/v1/workspaces/:workspaceId/boards/:boardId/lists", listRoutes);
app.use(
  "/api/v1/workspaces/:workspaceId/boards/:boardId/lists/:listId/cards",
  cardRoutes
);
// Board-level card routes (search / stats / bulk)
app.use("/api/v1/workspaces/:workspaceId/boards/:boardId/cards", cardRoutes);
app.use(
  "/api/v1/workspaces/:workspaceId/boards/:boardId/cards/:cardId/comments",
  commentRoutes
);

// ─── 12. 404 ─────────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => sendNotFound(res, "Route not found"));

// ─── 13. Global error handler ─────────────────────────────────────────────────
app.use(errorMiddleware);

export default app;