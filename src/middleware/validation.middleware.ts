// src/middleware/validation.middleware.ts
import { Request, Response, NextFunction } from "express";
import { sendBadRequest } from "../utils/response";

type Rule = {
  field: string;
  required?: boolean;
  type?: "string" | "number" | "boolean" | "array" | "object";
  minLength?: number;
  maxLength?: number;
  isEmail?: boolean;
  min?: number;
  max?: number;
  enum?: unknown[];
  pattern?: RegExp;
  patternMessage?: string;
  custom?: (v: unknown) => string | null;
};

export const validate = (rules: Rule[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const errors: string[] = [];
    for (const r of rules) {
      const v = req.body[r.field];
      const empty = v === undefined || v === null || v === "";
      if (r.required && empty) { errors.push(`'${r.field}' is required`); continue; }
      if (empty) continue;
      if (r.type === "array" && !Array.isArray(v)) errors.push(`'${r.field}' must be an array`);
      else if (r.type && r.type !== "array" && typeof v !== r.type) errors.push(`'${r.field}' must be ${r.type}`);
      if (r.isEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) errors.push(`'${r.field}' must be a valid email`);
      if (r.minLength !== undefined && typeof v === "string" && v.length < r.minLength) errors.push(`'${r.field}' min ${r.minLength} chars`);
      if (r.maxLength !== undefined && typeof v === "string" && v.length > r.maxLength) errors.push(`'${r.field}' max ${r.maxLength} chars`);
      if (r.min !== undefined && typeof v === "number" && v < r.min) errors.push(`'${r.field}' min ${r.min}`);
      if (r.max !== undefined && typeof v === "number" && v > r.max) errors.push(`'${r.field}' max ${r.max}`);
      if (r.enum && !r.enum.includes(v)) errors.push(`'${r.field}' must be one of: ${r.enum.join(", ")}`);
      if (r.pattern && typeof v === "string" && !r.pattern.test(v)) errors.push(r.patternMessage ?? `'${r.field}' invalid format`);
      if (r.custom) { const e = r.custom(v); if (e) errors.push(e); }
    }
    if (errors.length) { sendBadRequest(res, "Validation failed", errors); return; }
    next();
  };