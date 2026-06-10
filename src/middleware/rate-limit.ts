// src/middleware/rate-limit.ts
import rateLimit, { Options, RateLimitRequestHandler, Store } from "express-rate-limit";
import env from "../config/env";
import logger from "../utils/logger";

let _store: Store | undefined = undefined;

export async function initRateLimitStore() {
    if (!env.REDIS_URL) {
        logger.warn("Rate limiter: no REDIS_URL — using in-memory store");
        return;
    }
    try {
        const { RedisStore } = await import("rate-limit-redis");
        const Redis = (await import("ioredis")).default;

        const isTls = env.REDIS_URL.startsWith("rediss://");
        const client = new Redis(env.REDIS_URL, {
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
            ...(isTls ? { tls: { rejectUnauthorized: false } } : {}),
        });

        _store = new RedisStore({
            sendCommand: (...a: string[]) => (client as any).call(...a),
        });
        logger.info("Rate limiter: Redis store active");
    } catch (e) {
        logger.warn("Rate limiter: Redis unavailable, using in-memory", e);
    }
}

// FIX: use req.ip instead of reading x-forwarded-for directly.
// app.ts sets `trust proxy: 1` so Express already resolves req.ip
// to the real client IP behind Render's proxy. Reading the raw header
// lets bots spoof a fake IP and bypass all rate limits.
const keyGen: Options["keyGenerator"] = (req) => req.ip ?? "unknown";

const handler: Options["handler"] = (_req, res) =>
    res.status(429).json({
        success: false,
        message: "Too many requests. Slow down.",
        retryAfter: res.getHeader("Retry-After"),
    });

function make(overrides: Partial<Options>): RateLimitRequestHandler {
    return rateLimit({
        windowMs: env.RATE_LIMIT_WINDOW_MS,
        max: env.RATE_LIMIT_MAX,
        standardHeaders: true,
        legacyHeaders: false,
        handler,
        keyGenerator: keyGen,
        store: _store,
        ...overrides,
    });
}

export const globalLimiter = () => make({});
export const authLimiter = () => make({ max: env.AUTH_RATE_LIMIT_MAX, skipSuccessfulRequests: true });
export const strictLimiter = () => make({ max: 5, windowMs: 60 * 60 * 1000 });
export const writeLimiter = () => make({ max: 60, skip: (req) => req.method === "GET" });
export const wsLimiter = () => make({ max: 30, windowMs: 60 * 1000 });