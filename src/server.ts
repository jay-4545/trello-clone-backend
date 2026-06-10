// src/server.ts
import "dotenv/config";
import http from "http";
import app from "./app";
import sequelize from "./config/db";
import { setupAssociations } from "./config/associations";
import { initSocket } from "./socket";
import { initRateLimitStore } from "./middleware/rate-limit";
import logger from "./utils/logger";
import env from "./config/env";

const PORT = env.PORT;
const HOST = "0.0.0.0"; // Required for Render

async function start() {
  try {
    await sequelize.authenticate();
    logger.info("Database connected");
    setupAssociations();

    // FIX: NEVER use alter: true in production.
    // alter runs ALTER TABLE on every startup — on a live DB this causes downtime.
    // In production, schema is already correct from previous deploys.
    await sequelize.sync({ alter: env.NODE_ENV === "development", force: false });
    logger.info("Database synced");

    await initRateLimitStore();

    const httpServer = http.createServer(app);
    initSocket(httpServer);
    logger.info("Socket.IO initialised");

    httpServer.listen(PORT, HOST, () => {
      logger.info(`Server running on http://${HOST}:${PORT} [PID ${process.pid}]`);
      logger.info(`Environment: ${env.NODE_ENV}`);
    });

    const shutdown = async (signal: string) => {
      logger.info(`${signal} received — shutting down gracefully`);
      httpServer.close(async () => {
        await sequelize.close();
        logger.info("DB connection closed");
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 10_000);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (err) {
    logger.error("Startup failed:", err);
    process.exit(1);
  }
}

start();