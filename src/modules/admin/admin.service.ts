// src/modules/admin/admin.service.ts
import { Op } from "sequelize";
import User from "../auth/auth.model";
import Workspace from "../workspace/workspace.model";
import Board from "../board/board.model";
import Card from "../card/card.model";
import Comment from "../comment/comment.model";
import { NotFoundError } from "../../utils/errors";
import { SystemRole } from "../../types";
import {
    getErrorLogs as fetchErrorLogs,
    getErrorLogById as fetchErrorLogById,
    getErrorLogStats as fetchErrorLogStats,
} from "../error-log/error-log.service";
import type { ErrorLogLevel, ErrorLogSource } from "../error-log/error-log.model";

type PaginatedQuery = { page?: number; limit?: number; search?: string };

function paginate(page?: number, limit?: number) {
    const p = Math.max(1, page ?? 1);
    const l = Math.min(100, limit ?? 20);
    return { page: p, limit: l, offset: (p - 1) * l };
}

function meta(total: number, page: number, limit: number) {
    return { total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
}

export const getUsers = async (query: {
    page?: number; limit?: number; search?: string; role?: SystemRole; status?: string;
}) => {
    const { page, limit, offset } = paginate(query.page, query.limit);
    const where: any = {};
    if (query.search) where[Op.or] = [{ name: { [Op.iLike]: `%${query.search}%` } }, { email: { [Op.iLike]: `%${query.search}%` } }];
    if (query.role) where.role = query.role;
    if (query.status === "active") where.isActive = true;
    if (query.status === "inactive") where.isActive = false;

    const { count, rows } = await User.findAndCountAll({
        where, limit, offset, order: [["createdAt", "DESC"]],
    });
    return { users: rows.map((r) => r.toJSON()), meta: meta(count, page, limit) };
};

export const getUserById = async (userId: number) => {
    const user = await User.findByPk(userId);
    if (!user) throw new NotFoundError("User not found");
    return user.toJSON();
};

export const updateUser = async (userId: number, body: Partial<{ name: string; role: SystemRole; isActive: boolean }>) => {
    const user = await User.findByPk(userId);
    if (!user) throw new NotFoundError("User not found");
    return (await user.update(body)).toJSON();
};

export const deleteUser = async (userId: number) => {
    const user = await User.findByPk(userId);
    if (!user) throw new NotFoundError("User not found");
    await user.destroy();
};

export const lockUser = async (userId: number, minutes: number) => {
    const user = await User.findByPk(userId);
    if (!user) throw new NotFoundError("User not found");
    return user.update({ lockedUntil: new Date(Date.now() + minutes * 60 * 1000) });
};

export const unlockUser = async (userId: number) => {
    const user = await User.findByPk(userId);
    if (!user) throw new NotFoundError("User not found");
    return user.update({ lockedUntil: null, failedLoginAttempts: 0 });
};

export const getSystemStats = async () => {
    const [totalUsers, activeUsers, totalWorkspaces, totalBoards, totalCards, totalComments] = await Promise.all([
        User.count(),
        User.count({ where: { isActive: true, lastLoginAt: { [Op.gte]: new Date(Date.now() - 30 * 864e5) } } }),
        Workspace.count(),
        Board.count(),
        Card.count(),
        Comment.count({ where: { isDeleted: false } }),
    ]);

    return { totalUsers, activeUsers, totalWorkspaces, totalBoards, totalCards, totalComments };
};

export const getWorkspaces = async (query: PaginatedQuery) => {
    const { page, limit, offset } = paginate(query.page, query.limit);
    const where: any = {};
    if (query.search) {
        where[Op.or] = [
            { name: { [Op.iLike]: `%${query.search}%` } },
            { slug: { [Op.iLike]: `%${query.search}%` } },
        ];
    }
    const { count, rows } = await Workspace.findAndCountAll({
        where,
        include: [{ model: User, as: "owner", attributes: ["id", "name", "email"] }],
        limit,
        offset,
        order: [["createdAt", "DESC"]],
    });
    return { items: rows.map((r) => r.toJSON()), meta: meta(count, page, limit) };
};

export const getBoards = async (query: PaginatedQuery & { visibility?: string; closed?: string }) => {
    const { page, limit, offset } = paginate(query.page, query.limit);
    const where: any = {};
    if (query.search) where.name = { [Op.iLike]: `%${query.search}%` };
    if (query.visibility) where.visibility = query.visibility;
    if (query.closed === "true") where.isClosed = true;
    if (query.closed === "false") where.isClosed = false;

    const { count, rows } = await Board.findAndCountAll({
        where,
        include: [
            { model: Workspace, as: "workspace", attributes: ["id", "name", "slug"] },
            { model: User, as: "creator", attributes: ["id", "name", "email"] },
        ],
        limit,
        offset,
        order: [["createdAt", "DESC"]],
    });
    return { items: rows.map((r) => r.toJSON()), meta: meta(count, page, limit) };
};

export const getCards = async (query: PaginatedQuery & { status?: string; archived?: string }) => {
    const { page, limit, offset } = paginate(query.page, query.limit);
    const where: any = {};
    if (query.search) {
        where[Op.or] = [
            { title: { [Op.iLike]: `%${query.search}%` } },
            { description: { [Op.iLike]: `%${query.search}%` } },
        ];
    }
    if (query.status) where.status = query.status;
    if (query.archived === "true") where.isArchived = true;
    if (query.archived === "false") where.isArchived = false;

    const { count, rows } = await Card.findAndCountAll({
        where,
        include: [
            { model: Board, as: "board", attributes: ["id", "name", "workspaceId"] },
            { model: User, as: "creator", attributes: ["id", "name", "email"] },
        ],
        limit,
        offset,
        order: [["createdAt", "DESC"]],
    });
    return { items: rows.map((r) => r.toJSON()), meta: meta(count, page, limit) };
};

export const getComments = async (query: PaginatedQuery & { status?: string }) => {
    const { page, limit, offset } = paginate(query.page, query.limit);
    const where: any = {};
    if (query.search) where.content = { [Op.iLike]: `%${query.search}%` };
    if (query.status === "active") where.isDeleted = false;
    if (query.status === "deleted") where.isDeleted = true;

    const { count, rows } = await Comment.findAndCountAll({
        where,
        include: [
            { model: User, as: "author", attributes: ["id", "name", "email"] },
            { model: Card, as: "card", attributes: ["id", "title", "boardId"] },
        ],
        limit,
        offset,
        order: [["createdAt", "DESC"]],
    });
    return { items: rows.map((r) => r.toJSON()), meta: meta(count, page, limit) };
};

export const getErrorLogs = (query: {
    page?: number;
    limit?: number;
    search?: string;
    statusCode?: number;
    source?: ErrorLogSource;
    level?: ErrorLogLevel;
    userId?: number;
    from?: string;
    to?: string;
}) => fetchErrorLogs(query);

export const getErrorLogById = (id: number) => fetchErrorLogById(id);

export const getErrorLogStats = () => fetchErrorLogStats();