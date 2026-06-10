// src/utils/jwt.ts
import jwt from "jsonwebtoken";
import env from "../config/env";
import { SystemRole } from "../types";

export interface JwtPayload {
  id: number;
  email: string;
  role: SystemRole;
}

// ─── Access token (short-lived: 15m) ─────────────────────────────────────────
export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as jwt.SignOptions);
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
};

// ─── Refresh token (long-lived: 7d) ──────────────────────────────────────────
export const generateRefreshToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  } as jwt.SignOptions);
};

export const verifyRefreshToken = (token: string): JwtPayload => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;
};

// ─── Token pair (used by auth service) ───────────────────────────────────────
export const generateTokenPair = (
  payload: JwtPayload
): { accessToken: string; refreshToken: string } => {
  return {
    accessToken: generateToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
};