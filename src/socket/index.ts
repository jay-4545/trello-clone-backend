// src/socket/index.ts
import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { redis, redisSub } from "../config/redis";
import { verifyToken } from "../utils/jwt";
import { SocketEvent } from "../types";
import BoardMember from "../modules/board/board-member.model";
import WorkspaceMember from "../modules/workspace/workspace-member.model";
import Board from "../modules/board/board.model";
import logger from "../utils/logger";
import env from "../config/env";
import { corsOptions } from "../config/cors";

interface AuthSocket extends Socket {
    userId: number;
    userEmail: string;
}

let io: Server;

export function initSocket(httpServer: HttpServer): Server {
    io = new Server(httpServer, {
        cors: {
            origin: corsOptions.origin as any,
            methods: ["GET", "POST"],
            credentials: true,
        },
        perMessageDeflate: false,
        httpCompression: { threshold: 1024 },
        pingTimeout: 20_000,
        pingInterval: 25_000,
        transports: ["websocket", "polling"],
    });

    // ─── Redis adapter (only when Redis is available) ─────────────────────────
    if (redis && redisSub) {
        import("@socket.io/redis-adapter")
            .then(({ createAdapter }) => {
                io.adapter(createAdapter(redis!, redisSub!));
                logger.info("Socket.IO: Redis adapter attached");
            })
            .catch((err) =>
                logger.warn("Socket.IO: Redis adapter failed, running single-node", err)
            );
    } else {
        logger.warn("Socket.IO: No Redis — running in single-node mode");
    }

    // ─── JWT authentication handshake ────────────────────────────────────────
    io.use((socket: any, next) => {
        const token =
            socket.handshake.auth?.token ||
            socket.handshake.headers?.authorization?.replace("Bearer ", "");
        if (!token) return next(new Error("Authentication required"));
        try {
            const payload = verifyToken(token);
            socket.userId = payload.id;
            socket.userEmail = payload.email;
            next();
        } catch {
            next(new Error("Invalid or expired token"));
        }
    });

    io.on("connection", (rawSocket) => {
        const socket = rawSocket as unknown as AuthSocket;
        logger.debug(`Socket connected: user ${socket.userId}`);

        // Auto-join personal notification room
        socket.join(`user:${socket.userId}`);

        // ─── Join board room ──────────────────────────────────────────────────
        socket.on("board:join", async ({ boardId }: { boardId: number }) => {
            try {
                const hasAccess = await canAccessBoard(socket.userId, boardId);
                if (!hasAccess) {
                    socket.emit("error", { message: "Access denied" });
                    return;
                }
                socket.join(`board:${boardId}`);
                socket.to(`board:${boardId}`).emit(SocketEvent.USER_VIEWING, {
                    userId: socket.userId,
                    boardId,
                });
                logger.debug(`User ${socket.userId} joined board:${boardId}`);
            } catch (e) {
                logger.error("board:join error", e);
            }
        });

        // ─── Leave board room ─────────────────────────────────────────────────
        socket.on("board:leave", ({ boardId }: { boardId: number }) => {
            socket.leave(`board:${boardId}`);
            socket.to(`board:${boardId}`).emit(SocketEvent.USER_OFFLINE, {
                userId: socket.userId,
                boardId,
            });
        });

        // ─── Typing indicator for comments ────────────────────────────────────
        socket.on(
            "card:typing",
            ({ cardId, boardId }: { cardId: number; boardId: number }) => {
                socket.to(`board:${boardId}`).emit("card:typing", {
                    userId: socket.userId,
                    cardId,
                });
            }
        );

        socket.on("disconnect", () => {
            logger.debug(`Socket disconnected: user ${socket.userId}`);
        });
    });

    return io;
}

export function getIO(): Server {
    if (!io) throw new Error("Socket.IO not initialized");
    return io;
}

/** Broadcast an event to everyone in a board room */
export function emitToBoard(boardId: number, event: SocketEvent, payload: object) {
    getIO().to(`board:${boardId}`).emit(event, payload);
}

/** Send a notification directly to a specific user's private room */
export function emitToUser(userId: number, event: string, payload: object) {
    getIO().to(`user:${userId}`).emit(event, payload);
}

// ─── Access check for socket connections (lightweight) ───────────────────────
async function canAccessBoard(userId: number, boardId: number): Promise<boolean> {
    const board = await Board.findByPk(boardId);
    if (!board) return false;
    if (board.visibility === "public") return true;

    const boardMember = await BoardMember.findOne({ where: { boardId, userId } });
    if (boardMember) return true;

    const wsMember = await WorkspaceMember.findOne({
        where: { workspaceId: board.workspaceId, userId },
    });
    return !!wsMember;
}