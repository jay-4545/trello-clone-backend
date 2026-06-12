// src/modules/error-log/error-log.service.ts
import { Request } from "express";
import { Op } from "sequelize";
import ErrorLog, { ErrorLogLevel, ErrorLogSource } from "./error-log.model";
import { AppError, NotFoundError } from "../../utils/errors";
import env from "../../config/env";
import logger from "../../utils/logger";
import { buildRequestContext, getRequestPath } from "./error-log.util";
import User from "../auth/auth.model";

export interface ResolvedHttpError {
    statusCode: number;
    message: string;
    responseMessage: string;
    errors?: unknown;
    validationErrors?: string[];
    isOperational: boolean;
    errorName: string;
    level: ErrorLogLevel;
    context?: Record<string, unknown>;
}

export interface RecordErrorInput {
    req: Request;
    source: ErrorLogSource;
    statusCode: number;
    message: string;
    responseMessage?: string;
    errorName?: string | null;
    stack?: string | null;
    isOperational?: boolean;
    level?: ErrorLogLevel;
    validationErrors?: string[] | null;
    context?: Record<string, unknown> | null;
    err?: Error;
}

export function resolveHttpError(err: Error): ResolvedHttpError {
    if (err instanceof AppError) {
        return {
            statusCode: err.statusCode,
            message: err.message,
            responseMessage: err.message,
            isOperational: err.isOperational,
            errorName: err.constructor.name,
            level: err.statusCode >= 500 ? "error" : "warning",
        };
    }

    if (err.message?.startsWith("CORS")) {
        return {
            statusCode: 403,
            message: err.message,
            responseMessage: err.message,
            isOperational: true,
            errorName: "CorsError",
            level: "warning",
        };
    }

    if ((err as any).name === "SequelizeUniqueConstraintError") {
        return {
            statusCode: 409,
            message: err.message,
            responseMessage: "Already exists",
            isOperational: true,
            errorName: (err as any).name,
            level: "warning",
            context: { fields: (err as any).fields },
        };
    }

    if ((err as any).name === "SequelizeValidationError") {
        const validationErrors = (err as any).errors?.map((e: any) => e.message) ?? [];
        return {
            statusCode: 400,
            message: err.message,
            responseMessage: "Validation failed",
            errors: validationErrors,
            validationErrors,
            isOperational: true,
            errorName: (err as any).name,
            level: "warning",
        };
    }

    if (err.name === "JsonWebTokenError") {
        return {
            statusCode: 401,
            message: err.message,
            responseMessage: "Invalid token",
            isOperational: true,
            errorName: err.name,
            level: "warning",
        };
    }

    if (err.name === "TokenExpiredError") {
        return {
            statusCode: 401,
            message: err.message,
            responseMessage: "Token expired",
            isOperational: true,
            errorName: err.name,
            level: "warning",
        };
    }

    if ((err as any).type === "entity.parse.failed") {
        return {
            statusCode: 400,
            message: err.message,
            responseMessage: "Invalid JSON",
            isOperational: true,
            errorName: "JsonParseError",
            level: "warning",
        };
    }

    if ((err as any).type === "entity.too.large") {
        return {
            statusCode: 413,
            message: err.message,
            responseMessage: "Request body too large",
            isOperational: true,
            errorName: "PayloadTooLarge",
            level: "warning",
        };
    }

    const responseMessage = env.NODE_ENV === "production" ? "Internal server error" : err.message;
    return {
        statusCode: 500,
        message: err.message,
        responseMessage,
        isOperational: false,
        errorName: err.name || "Error",
        level: "error",
    };
}

export function recordError(input: RecordErrorInput): void {
    const {
        req,
        source,
        statusCode,
        message,
        responseMessage,
        errorName,
        stack,
        isOperational,
        level,
        validationErrors,
        context,
        err,
    } = input;

    const requestContext = buildRequestContext(req);

    ErrorLog.create({
        requestId: req.requestId ?? null,
        userId: req.user?.id ?? null,
        level: level ?? (statusCode >= 500 ? "error" : "warning"),
        source,
        method: req.method,
        path: getRequestPath(req),
        statusCode,
        errorName: errorName ?? err?.name ?? null,
        message,
        stack: stack ?? err?.stack ?? null,
        isOperational: isOperational ?? false,
        responseMessage: responseMessage ?? message,
        validationErrors: validationErrors ?? null,
        ip: requestContext.ip,
        userAgent: requestContext.userAgent,
        query: requestContext.query,
        body: requestContext.body,
        context: context ?? null,
        durationMs: requestContext.durationMs,
    }).catch((dbErr) => {
        logger.error("Failed to persist error log", { message: (dbErr as Error).message });
    });
}

export function recordErrorFromException(
    req: Request,
    err: Error,
    source: ErrorLogSource = "error_middleware"
): ResolvedHttpError {
    const resolved = resolveHttpError(err);
    recordError({
        req,
        source,
        err,
        statusCode: resolved.statusCode,
        message: resolved.message,
        responseMessage: resolved.responseMessage,
        errorName: resolved.errorName,
        stack: err.stack,
        isOperational: resolved.isOperational,
        level: resolved.level,
        validationErrors: resolved.validationErrors ?? null,
        context: resolved.context ?? null,
    });
    return resolved;
}

function paginate(page?: number, limit?: number) {
    const p = Math.max(1, page ?? 1);
    const l = Math.min(100, limit ?? 20);
    return { page: p, limit: l, offset: (p - 1) * l };
}

function meta(total: number, page: number, limit: number) {
    return { total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
}

export const getErrorLogs = async (query: {
    page?: number;
    limit?: number;
    search?: string;
    statusCode?: number;
    source?: ErrorLogSource;
    level?: ErrorLogLevel;
    userId?: number;
    from?: string;
    to?: string;
}) => {
    const { page, limit, offset } = paginate(query.page, query.limit);
    const where: any = {};

    if (query.search) {
        where[Op.or] = [
            { message: { [Op.iLike]: `%${query.search}%` } },
            { path: { [Op.iLike]: `%${query.search}%` } },
            { requestId: { [Op.iLike]: `%${query.search}%` } },
            { errorName: { [Op.iLike]: `%${query.search}%` } },
        ];
    }
    if (query.statusCode) where.statusCode = query.statusCode;
    if (query.source) where.source = query.source;
    if (query.level) where.level = query.level;
    if (query.userId) where.userId = query.userId;
    if (query.from || query.to) {
        where.createdAt = {};
        if (query.from) where.createdAt[Op.gte] = new Date(query.from);
        if (query.to) where.createdAt[Op.lte] = new Date(query.to);
    }

    const { count, rows } = await ErrorLog.findAndCountAll({
        where,
        include: [{ model: User, as: "user", attributes: ["id", "name", "email", "role"] }],
        limit,
        offset,
        order: [["createdAt", "DESC"]],
    });

    return { items: rows.map((r) => r.toJSON()), meta: meta(count, page, limit) };
};

export const getErrorLogById = async (id: number) => {
    const log = await ErrorLog.findByPk(id, {
        include: [{ model: User, as: "user", attributes: ["id", "name", "email", "role"] }],
    });
    if (!log) throw new NotFoundError("Error log not found");
    return log.toJSON();
};

export function recordSocketError(input: {
    userId?: number | null;
    event: string;
    message: string;
    statusCode?: number;
    errorName?: string;
    stack?: string | null;
    context?: Record<string, unknown> | null;
    level?: ErrorLogLevel;
}): void {
    ErrorLog.create({
        requestId: null,
        userId: input.userId ?? null,
        level: input.level ?? "warning",
        source: "socket",
        method: "SOCKET",
        path: input.event,
        statusCode: input.statusCode ?? 403,
        errorName: input.errorName ?? "SocketError",
        message: input.message,
        stack: input.stack ?? null,
        isOperational: true,
        responseMessage: input.message,
        validationErrors: null,
        ip: null,
        userAgent: null,
        query: null,
        body: null,
        context: input.context ?? null,
        durationMs: null,
    }).catch((dbErr) => {
        logger.error("Failed to persist socket error log", { message: (dbErr as Error).message });
    });
}

export const getErrorLogStats = async () => {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [total, last24h, serverErrors24h, warnings24h] = await Promise.all([
        ErrorLog.count(),
        ErrorLog.count({ where: { createdAt: { [Op.gte]: since24h } } }),
        ErrorLog.count({ where: { createdAt: { [Op.gte]: since24h }, statusCode: { [Op.gte]: 500 } } }),
        ErrorLog.count({ where: { createdAt: { [Op.gte]: since24h }, level: "warning" } }),
    ]);
    return { total, last24h, serverErrors24h, warnings24h };
};
