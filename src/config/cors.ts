// src/config/cors.ts
import { CorsOptions } from "cors";
import env from "./env";

const allowed = env.CORS_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean);

export const corsOptions: CorsOptions = {
    origin: (origin, cb) => {
        if (!origin) return cb(null, true); // server-to-server
        if (allowed.includes(origin)) return cb(null, true);
        if (env.NODE_ENV === "development" && /^https?:\/\/localhost/.test(origin))
            return cb(null, true);
        cb(new Error(`CORS: origin '${origin}' not allowed`));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
    exposedHeaders: ["X-Request-ID", "RateLimit-Limit", "RateLimit-Remaining", "RateLimit-Reset"],
    credentials: true,
    maxAge: 86400,
};