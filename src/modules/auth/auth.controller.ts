// src/modules/auth/auth.controller.ts
import { Request, Response, NextFunction } from "express";
import * as S from "./auth.service";
import { sendSuccess, sendCreated } from "../../utils/response";
import { BadRequestError } from "../../utils/errors";

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try { sendCreated(res, "Registered", await S.registerUser(req.body)); } catch (e) { next(e); }
};
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, "Login successful", await S.loginUser(req.body)); } catch (e) { next(e); }
};
export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try { await S.logoutUser(req.user!.id); sendSuccess(res, "Logged out"); } catch (e) { next(e); }
};
export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, "Profile", await S.getProfile(req.user!.id)); } catch (e) { next(e); }
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw new BadRequestError("Refresh token required");
    sendSuccess(res, "Token refreshed", await S.refreshTokens(refreshToken));
  } catch (e) { next(e); }
};

export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = req.body;
    await S.changePassword(req.user!.id, currentPassword, newPassword);
    sendSuccess(res, "Password changed. Please log in again.");
  } catch (e) { next(e); }
};

export const uploadAvatar = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) throw new BadRequestError("No image file provided");
    const avatarUrl = await S.updateAvatar(req.user!.id, req.file.buffer);
    sendSuccess(res, "Avatar updated", { avatar: avatarUrl });
  } catch (e) { next(e); }
};