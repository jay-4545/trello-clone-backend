// src/config/db.ts
import { Sequelize } from "sequelize";
import env from "./env";
import logger from "../utils/logger";

/** Remote / managed Postgres (Neon, Render, etc.) needs SSL; local usually does not. */
function resolveSsl(databaseUrl: string): false | { require: true; rejectUnauthorized: boolean } {
  try {
    const { hostname, searchParams } = new URL(databaseUrl);
    const sslMode = searchParams.get("sslmode");
    const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
    if (isLocal && sslMode !== "require") return false;
    return { require: true, rejectUnauthorized: false };
  } catch {
    return { require: true, rejectUnauthorized: false };
  }
}

const dialectOptions: Record<string, unknown> = {};
const ssl = resolveSsl(env.DATABASE_URL);
if (ssl) dialectOptions.ssl = ssl;

const sequelize = new Sequelize(env.DATABASE_URL, {
  dialect: "postgres",
  logging: false,
  pool: {
    max: env.DB_POOL_MAX,
    min: env.DB_POOL_MIN,
    acquire: 30000,
    idle: 10000,
  },
  dialectOptions,
  define: {
    underscored: false,
    freezeTableName: true,
    timestamps: true,
  },
});

export default sequelize;
