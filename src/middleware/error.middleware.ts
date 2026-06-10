// src/middleware/error.middleware.ts
import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors";
import { sendError } from "../utils/response";
import logger from "../utils/logger";
import env from "../config/env";

export const errorMiddleware = (err: Error, req: Request, res: Response, _next: NextFunction): void => {
  const rid = req.requestId ?? "?";
  logger.error(`[${rid}] ${req.method} ${req.path} — ${err.message}`, { stack: err.stack });

  if (err instanceof AppError) { sendError(res, err.message, err.statusCode); return; }
  if (err.message?.startsWith("CORS")) { sendError(res, err.message, 403); return; }
  if ((err as any).name === "SequelizeUniqueConstraintError") { sendError(res, "Already exists", 409); return; }
  if ((err as any).name === "SequelizeValidationError") { sendError(res, "Validation failed", 400, (err as any).errors?.map((e: any) => e.message)); return; }
  if (err.name === "JsonWebTokenError") { sendError(res, "Invalid token", 401); return; }
  if (err.name === "TokenExpiredError") { sendError(res, "Token expired", 401); return; }
  if ((err as any).type === "entity.parse.failed") { sendError(res, "Invalid JSON", 400); return; }
  if ((err as any).type === "entity.too.large") { sendError(res, "Request body too large", 413); return; }

  const msg = env.NODE_ENV === "production" ? "Internal server error" : err.message;
  sendError(res, msg, 500);
};