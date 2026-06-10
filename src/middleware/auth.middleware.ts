// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import { sendUnauthorized } from "../utils/response";

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) { sendUnauthorized(res, "Access token required"); return; }
    const token = header.split(" ")[1];
    if (!token || token.length < 20) { sendUnauthorized(res, "Malformed token"); return; }
    req.user = verifyToken(token);
    next();
  } catch (err: any) {
    sendUnauthorized(res, err?.name === "TokenExpiredError" ? "Token expired" : "Invalid token");
  }
};

export const optionalAuth = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const header = req.headers.authorization;
    if (header?.startsWith("Bearer ")) req.user = verifyToken(header.split(" ")[1]);
  } catch { /* public route */ }
  next();
};