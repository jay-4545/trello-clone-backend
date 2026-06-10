// src/cluster.ts

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