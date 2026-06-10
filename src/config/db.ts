// src/config/db.ts
import { Sequelize } from "sequelize";
import env from "./env";
import logger from "../utils/logger";

let sequelize: Sequelize;

if (env.DATABASE_URL) {
  // ── Render / production: use DATABASE_URL ──────────────────────────────────
  sequelize = new Sequelize(env.DATABASE_URL, {
    dialect: "postgres",
    logging: env.NODE_ENV === "development" ? (sql) => logger.debug(sql) : false,
    pool: {
      max: env.DB_POOL_MAX,
      min: env.DB_POOL_MIN,
      acquire: 30000,
      idle: 10000,
    },
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false, // Required for Render's managed Postgres
      },
    },
    define: {
      underscored: false,
      freezeTableName: true,
      timestamps: true,
    },
  });
} else {
  // ── Local dev: use individual DB_* vars ────────────────────────────────────
  sequelize = new Sequelize(env.DB_NAME, env.DB_USER, env.DB_PASSWORD, {
    host: env.DB_HOST,
    port: env.DB_PORT,
    dialect: "postgres",
    logging: env.NODE_ENV === "development" ? (sql) => logger.debug(sql) : false,
    pool: {
      max: env.DB_POOL_MAX,
      min: env.DB_POOL_MIN,
      acquire: 30000,
      idle: 10000,
    },
    define: {
      underscored: false,
      freezeTableName: true,
      timestamps: true,
    },
  });
}

export default sequelize;