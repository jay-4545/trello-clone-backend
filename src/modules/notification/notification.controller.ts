// src/modules/notification/notification.controller.ts
import { Request, Response, NextFunction } from "express";
import * as S from "./notification.service";
import { sendSuccess } from "../../utils/response";

const h = (fn: Function) => async (req: Request, res: Response, next: NextFunction) => { try { await fn(req, res); } catch (e) { next(e); } };

export const getNotifications = h(async (req: Request, res: Response) => {
    const { page, limit, unreadOnly } = req.query as Record<string, string>;
    const result = await S.getNotifications(req.user!.id, {
        page: page ? +page : 1, limit: limit ? +limit : 20,
        unreadOnly: unreadOnly === "true",
    });
    sendSuccess(res, "Notifications", result.notifications, 200, result.meta);
});

export const getUnreadCount = h(async (req: Request, res: Response) => { sendSuccess(res, "Unread count", { count: await S.getUnreadCount(req.user!.id) }); });
export const markRead = h(async (req: Request, res: Response) => { sendSuccess(res, "Marked read", await S.markRead(+req.params.notifId, req.user!.id)); });
export const markAllRead = h(async (req: Request, res: Response) => { sendSuccess(res, "All marked read", await S.markAllRead(req.user!.id)); });
export const deleteNotification = h(async (req: Request, res: Response) => { await S.deleteNotification(+req.params.notifId, req.user!.id); sendSuccess(res, "Deleted"); });