// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import { sendUnauthorized } from "../utils/response";
import { recordError } from "../modules/error-log/error-log.service";

function logAuthFailure(req: Request, message: string, errorName?: string) {
  recordError({
    req,
    source: "auth",
    statusCode: 401,
    message,
    responseMessage: message,
    errorName: errorName ?? "UnauthorizedError",
    level: "warning",
    isOperational: true,
  });
}

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      logAuthFailure(req, "Access token required");
      sendUnauthorized(res, "Access token required");
      return;
    }
    const token = header.split(" ")[1];
    if (!token || token.length < 20) {
      logAuthFailure(req, "Malformed token");
      sendUnauthorized(res, "Malformed token");
      return;
    }
    req.user = verifyToken(token);
    next();
  } catch (err: any) {
    const message = err?.name === "TokenExpiredError" ? "Token expired" : "Invalid token";
    logAuthFailure(req, err?.message ?? message, err?.name);
    sendUnauthorized(res, message);
  }
};

export const optionalAuth = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const header = req.headers.authorization;
    if (header?.startsWith("Bearer ")) req.user = verifyToken(header.split(" ")[1]);
  } catch { /* public route */ }
  next();
};