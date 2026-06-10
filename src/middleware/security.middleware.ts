// src/middleware/security.middleware.ts
import { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import { v4 as uuidv4 } from "uuid";
import env from "../config/env";

export const helmetMiddleware = helmet({
    contentSecurityPolicy: {
        directives: { defaultSrc: ["'none'"], scriptSrc: ["'none'"], frameAncestors: ["'none'"] },
    },
    noSniff: true,
    hsts: env.NODE_ENV === "production"
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
        : false,
    hidePoweredBy: true,
    frameguard: { action: "deny" },
    referrerPolicy: { policy: "no-referrer" },
});

export const requestId = (req: Request, res: Response, next: NextFunction): void => {
    const id = (req.headers["x-request-id"] as string) ?? uuidv4();
    req.requestId = id;
    req.startTime = Date.now();
    res.setHeader("X-Request-ID", id);
    next();
};

export const sanitizeBody = (req: Request, _res: Response, next: NextFunction): void => {
    if (req.body && typeof req.body === "object") req.body = deepSanitize(req.body);
    next();
};

function deepSanitize(obj: unknown): unknown {
    if (Array.isArray(obj)) return obj.map(deepSanitize);
    if (obj !== null && typeof obj === "object") {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
            if (k.startsWith("$") || k.includes(".")) continue; // NoSQL injection guard
            out[k] = deepSanitize(v);
        }
        return out;
    }
    if (typeof obj === "string") return obj.replace(/\0/g, "").trim();
    return obj;
}

export const sanitizeQuery = (req: Request, _res: Response, next: NextFunction): void => {
    for (const [k, v] of Object.entries(req.query)) {
        if (typeof v === "string") {
            (req.query as Record<string, unknown>)[k] = v.replace(/\0/g, "").replace(/<script[\s\S]*?<\/script>/gi, "").trim();
        }
    }
    next();
};

export const preventParamPollution = (req: Request, _res: Response, next: NextFunction): void => {
    const safe = ["status", "priority", "sortBy", "sortOrder", "page", "limit", "tags", "labels"];
    for (const k of safe) {
        if (Array.isArray(req.query[k])) {
            const arr = req.query[k] as string[];
            (req.query as Record<string, unknown>)[k] = arr[arr.length - 1];
        }
    }
    next();
};