// src/config/redis.ts
import Redis from "ioredis";
import env from "./env";
import logger from "../utils/logger";

// ─── TLS required for rediss:// URLs (Render Redis, Upstash) ─────────────────
function buildOpts(url: string) {
    const isTls = url.startsWith("rediss://");
    return {
        maxRetriesPerRequest: null as null,
        enableReadyCheck: false,
        ...(env.REDIS_PASSWORD ? { password: env.REDIS_PASSWORD } : {}),
        ...(isTls
            ? { tls: { rejectUnauthorized: false } }
            : {}),
    };
}

// ─── Null-safe clients ────────────────────────────────────────────────────────
// Redis is optional: if REDIS_URL is empty the app runs without it
// (in-memory rate limiting, no Socket.IO cross-process pub/sub).

export let redis: Redis | null = null;
export let redisSub: Redis | null = null;

if (env.REDIS_URL) {
    const opts = buildOpts(env.REDIS_URL);

    redis = new Redis(env.REDIS_URL, opts);
    redisSub = new Redis(env.REDIS_URL, opts);

    redis.on("connect", () => logger.info("Redis connected"));
    redis.on("error", (err) => logger.error("Redis error:", err));
} else {
    logger.warn("REDIS_URL not set — Redis disabled (in-memory fallbacks active)");
}

export default redis;