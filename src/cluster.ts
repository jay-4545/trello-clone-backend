// src/cluster.ts
/**
 * Cluster mode — spawns one worker per CPU core.
 * Workers share the same port; the OS load-balances connections between them.
 * Socket.IO uses the Redis adapter so cross-worker pub/sub works correctly.
 *
 * Usage:
 *   npm run start:cluster
 *
 * For Kubernetes / Docker: run single workers per container and use a
 * reverse-proxy (nginx / ingress) for load balancing instead of this file.
 */
import cluster from "cluster";
import os from "os";
import logger from "./utils/logger";
import env from "./config/env";

const WORKERS = env.WORKER_THREADS || os.cpus().length;

if (cluster.isPrimary) {
    (logger as any).success(`Primary PID ${process.pid} — spawning ${WORKERS} workers`);

    for (let i = 0; i < WORKERS; i++) cluster.fork();

    cluster.on("exit", (worker, code, signal) => {
        logger.warn(`Worker ${worker.process.pid} exited (${signal ?? code}). Restarting…`);
        cluster.fork();   // auto-restart crashed workers
    });

    // Graceful shutdown: signal all workers
    const shutdown = (signal: string) => {
        logger.info(`${signal} — stopping all workers`);
        for (const id in cluster.workers) cluster.workers[id]?.send("shutdown");
        setTimeout(() => process.exit(0), 12000);
    };
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

} else {
    // Each worker runs the full server
    require("./server");

    process.on("message", (msg) => {
        if (msg === "shutdown") {
            logger.info(`Worker ${process.pid} shutting down`);
            process.exit(0);
        }
    });
}