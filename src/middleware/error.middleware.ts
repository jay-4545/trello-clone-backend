// src/middleware/error.middleware.ts
import { Request, Response, NextFunction } from "express";
import { sendError } from "../utils/response";
import logger from "../utils/logger";
import { recordErrorFromException } from "../modules/error-log/error-log.service";

export const errorMiddleware = (err: Error, req: Request, res: Response, _next: NextFunction): void => {
  const rid = req.requestId ?? "?";
  logger.error(`[${rid}] ${req.method} ${req.path} — ${err.message}`, { stack: err.stack });

  const resolved = recordErrorFromException(req, err, "error_middleware");

  if (resolved.errors !== undefined) {
    sendError(res, resolved.responseMessage, resolved.statusCode, resolved.errors);
    return;
  }

  sendError(res, resolved.responseMessage, resolved.statusCode);
};
