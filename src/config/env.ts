// src/config/env.ts
import dotenv from "dotenv";
dotenv.config();

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

const isProd = process.env.NODE_ENV === "production";

// Single connection string for all environments (local Postgres, Neon, Render, etc.)
const DATABASE_URL =
  process.env.DATABASE_URL ??
  (isProd ? undefined : "postgresql://postgres:postgres@localhost:5432/trello_db");

if (!DATABASE_URL) {
  throw new Error("Missing required env var: DATABASE_URL");
}

const env = {
  PORT: Number(optional("PORT", "5000")),
  NODE_ENV: optional("NODE_ENV", "development"),
  WORKER_THREADS: Number(optional("WORKER_THREADS", "0")),

  JWT_SECRET: isProd
    ? required("JWT_SECRET")
    : optional("JWT_SECRET", "dev_secret_min_32_chars_xxxxxxxxx"),
  JWT_EXPIRES_IN: optional("JWT_EXPIRES_IN", "15m"),
  JWT_REFRESH_SECRET: isProd
    ? required("JWT_REFRESH_SECRET")
    : optional("JWT_REFRESH_SECRET", "dev_refresh_secret_xxxxxxxxxxxxxxxxx"),
  JWT_REFRESH_EXPIRES_IN: optional("JWT_REFRESH_EXPIRES_IN", "7d"),

  DATABASE_URL,
  DB_POOL_MAX: Number(optional("DB_POOL_MAX", "10")),
  DB_POOL_MIN: Number(optional("DB_POOL_MIN", "2")),

  REDIS_URL: optional("REDIS_URL", ""),
  REDIS_PASSWORD: optional("REDIS_PASSWORD", ""),

  CORS_ORIGINS: optional("CORS_ORIGINS", "http://localhost:3000"),

  RATE_LIMIT_WINDOW_MS: Number(optional("RATE_LIMIT_WINDOW_MS", "900000")),
  RATE_LIMIT_MAX: Number(optional("RATE_LIMIT_MAX", "200")),
  AUTH_RATE_LIMIT_MAX: Number(optional("AUTH_RATE_LIMIT_MAX", "10")),

  BCRYPT_ROUNDS: Number(optional("BCRYPT_ROUNDS", "12")),
  MAX_REQUEST_BODY_SIZE: optional("MAX_REQUEST_BODY_SIZE", "10kb"),

  // ─── Cloudinary ───────────────────────────────────────────────────────────
  CLOUDINARY_CLOUD_NAME: isProd
    ? required("CLOUDINARY_CLOUD_NAME")
    : optional("CLOUDINARY_CLOUD_NAME", ""),
  CLOUDINARY_API_KEY: isProd
    ? required("CLOUDINARY_API_KEY")
    : optional("CLOUDINARY_API_KEY", ""),
  CLOUDINARY_API_SECRET: isProd
    ? required("CLOUDINARY_API_SECRET")
    : optional("CLOUDINARY_API_SECRET", ""),

  // ─── Brevo (SMTP) ─────────────────────────────────────────────────────────
  SMTP_HOST: optional("SMTP_HOST", "smtp-relay.brevo.com"),
  SMTP_PORT: Number(optional("SMTP_PORT", "587")),
  SMTP_USER: isProd ? required("SMTP_USER") : optional("SMTP_USER", ""),
  SMTP_PASS: isProd ? required("SMTP_PASS") : optional("SMTP_PASS", ""),
  EMAIL_FROM: optional("EMAIL_FROM", "noreply@yourdomain.com"),
  APP_NAME: optional("APP_NAME", "Trello Clone"),
  APP_URL: optional("APP_URL", "http://localhost:3000"),
};

export type Env = typeof env;
export default env;
