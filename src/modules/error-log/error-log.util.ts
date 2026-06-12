// src/modules/error-log/error-log.util.ts
import { Request } from "express";

const SENSITIVE_KEYS = [
    "password",
    "currentpassword",
    "newpassword",
    "confirmpassword",
    "refreshtoken",
    "accesstoken",
    "token",
    "secret",
    "authorization",
];

function isSensitiveKey(key: string): boolean {
    const lower = key.toLowerCase();
    return SENSITIVE_KEYS.some((s) => lower.includes(s));
}

export function sanitizeData(value: unknown, depth = 0): unknown {
    if (depth > 5) return "[TRUNCATED]";
    if (value === null || value === undefined) return value;
    if (Array.isArray(value)) return value.map((item) => sanitizeData(item, depth + 1));
    if (typeof value !== "object") return value;

    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
        result[key] = isSensitiveKey(key) ? "[REDACTED]" : sanitizeData(val, depth + 1);
    }
    return result;
}

export function sanitizeRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    return sanitizeData(value) as Record<string, unknown>;
}

export function getClientIp(req: Request): string {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string" && forwarded.length > 0) {
        return forwarded.split(",")[0]?.trim() || "unknown";
    }
    return req.socket.remoteAddress ?? "unknown";
}

export function getRequestPath(req: Request): string {
    return req.originalUrl || req.url || req.path || "/";
}

export function getRequestDurationMs(req: Request): number | null {
    if (req.startTime == null) return null;
    return Math.max(0, Date.now() - req.startTime);
}

export function buildRequestContext(req: Request): {
    query: Record<string, unknown> | null;
    body: Record<string, unknown> | null;
    ip: string;
    userAgent: string | null;
    durationMs: number | null;
} {
    return {
        query: sanitizeRecord(req.query),
        body: sanitizeRecord(req.body),
        ip: getClientIp(req),
        userAgent: typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : null,
        durationMs: getRequestDurationMs(req),
    };
}
