// src/modules/notification/notification.routes.ts
import { Router } from "express";
import * as C from "./notification.controller";
import { authenticate } from "../../middleware/auth.middleware";

const r = Router();
r.use(authenticate);

r.get("/", C.getNotifications);
r.get("/unread-count", C.getUnreadCount);
r.patch("/mark-all-read", C.markAllRead);
r.patch("/:notifId/read", C.markRead);
r.delete("/:notifId", C.deleteNotification);

export default r;