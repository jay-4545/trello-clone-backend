// src/modules/notification/notification.service.ts
import { Op } from "sequelize";
import Notification from "./notification.model";
import User from "../auth/auth.model";
import { NotFoundError } from "../../utils/errors";
import { emitToUser } from "../../socket";
import { NotificationType } from "../../types";

interface CreateNotifInput {
    userId: number;
    actorId?: number;
    type: NotificationType;
    title: string;
    body: string;
    entityType: "card" | "board" | "workspace" | "comment";
    entityId: number;
}

export const createNotification = async (input: CreateNotifInput) => {
    const notif = await Notification.create({
        userId: input.userId,
        actorId: input.actorId ?? null,
        type: input.type,
        title: input.title,
        body: input.body,
        entityType: input.entityType,
        entityId: input.entityId,
    });

    // Push real-time to the target user's socket room
    emitToUser(input.userId, "notification:new", {
        id: notif.id,
        type: notif.type,
        title: notif.title,
        body: notif.body,
        entityType: notif.entityType,
        entityId: notif.entityId,
        createdAt: notif.createdAt,
    });

    return notif;
};

export const getNotifications = async (
    userId: number,
    query: { page?: number; limit?: number; unreadOnly?: boolean }
) => {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, query.limit ?? 20);
    const where: any = { userId };
    if (query.unreadOnly) where.isRead = false;

    const { count, rows } = await Notification.findAndCountAll({
        where,
        include: [{ model: User, as: "actor", attributes: ["id", "name", "avatar"], required: false }],
        order: [["createdAt", "DESC"]],
        limit, offset: (page - 1) * limit,
    });

    return { notifications: rows, meta: { total: count, page, limit, totalPages: Math.ceil(count / limit) } };
};

export const getUnreadCount = async (userId: number) =>
    Notification.count({ where: { userId, isRead: false } });

export const markRead = async (notifId: number, userId: number) => {
    const notif = await Notification.findOne({ where: { id: notifId, userId } });
    if (!notif) throw new NotFoundError("Notification not found");
    return notif.update({ isRead: true, readAt: new Date() });
};

export const markAllRead = async (userId: number) => {
    const [updated] = await Notification.update(
        { isRead: true, readAt: new Date() },
        { where: { userId, isRead: false } }
    );
    return { updated };
};

export const deleteNotification = async (notifId: number, userId: number) => {
    const notif = await Notification.findOne({ where: { id: notifId, userId } });
    if (!notif) throw new NotFoundError("Notification not found");
    await notif.destroy();
};