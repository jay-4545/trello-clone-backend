// src/modules/admin/admin.service.ts
import { Op } from "sequelize";
import sequelize from "../../config/db";
import User from "../auth/auth.model";
import Workspace from "../workspace/workspace.model";
import Board from "../board/board.model";
import Card from "../card/card.model";
import Comment from "../comment/comment.model";
import { NotFoundError } from "../../utils/errors";
import { SystemRole } from "../../types";

export const getUsers = async (query: { page?: number; limit?: number; search?: string; role?: SystemRole }) => {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, query.limit ?? 20);
    const where: any = {};
    if (query.search) where[Op.or] = [{ name: { [Op.iLike]: `%${query.search}%` } }, { email: { [Op.iLike]: `%${query.search}%` } }];
    if (query.role) where.role = query.role;

    const { count, rows } = await User.findAndCountAll({ where, limit, offset: (page - 1) * limit, order: [["createdAt", "DESC"]] });
    return { users: rows, meta: { total: count, page, limit, totalPages: Math.ceil(count / limit) } };
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