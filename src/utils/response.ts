import { Response } from "express";

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: unknown;
  meta?: Record<string, unknown>;
}

export const sendSuccess = <T>(
  res: Response,
  message: string,
  data?: T,
  statusCode: number = 200,
  meta?: Record<string, unknown>
): Response => {
  const response: ApiResponse<T> = {
    success: true,
    message,
    ...(data !== undefined && { data }),
    ...(meta && { meta }),
  };
  return res.status(statusCode).json(response);
};

export const sendCreated = <T>(
  res: Response,
  message: string,
  data?: T
): Response => {
  return sendSuccess(res, message, data, 201);
};

export const sendError = (
  res: Response,
  message: string,
  statusCode: number = 500,
  errors?: unknown
): Response => {
  const response: ApiResponse = {
    success: false,
    message,
    ...(errors !== undefined && { errors }),
  };
  return res.status(statusCode).json(response);
};

export const sendNotFound = (res: Response, message: string = "Resource not found"): Response => {
  return sendError(res, message, 404);
};

export const sendUnauthorized = (res: Response, message: string = "Unauthorized"): Response => {
  return sendError(res, message, 401);
};

export const sendForbidden = (res: Response, message: string = "Forbidden"): Response => {
  return sendError(res, message, 403);
};

export const sendBadRequest = (res: Response, message: string, errors?: unknown): Response => {
  return sendError(res, message, 400, errors);
};
