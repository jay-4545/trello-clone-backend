// src/modules/admin/admin.controller.ts
import { Request, Response, NextFunction } from "express";
import * as S from "./admin.service";
import { sendSuccess } from "../../utils/response";

const h = (fn: Function) => async (req: Request, res: Response, next: NextFunction) => { try { await fn(req, res); } catch (e) { next(e); } };

export const getUsers = h(async (req: Request, res: Response) => {
    const { page, limit, search, role, status } = req.query as Record<string, string>;
    const result = await S.getUsers({ page: +page || 1, limit: +limit || 20, search, role: role as any, status });
    sendSuccess(res, "Users", result.users, 200, result.meta);
});
export const getWorkspaces = h(async (req: Request, res: Response) => {
    const { page, limit, search } = req.query as Record<string, string>;
    const result = await S.getWorkspaces({ page: +page || 1, limit: +limit || 20, search });
    sendSuccess(res, "Workspaces", result.items, 200, result.meta);
});
export const getBoards = h(async (req: Request, res: Response) => {
    const { page, limit, search, visibility, closed } = req.query as Record<string, string>;
    const result = await S.getBoards({ page: +page || 1, limit: +limit || 20, search, visibility, closed });
    sendSuccess(res, "Boards", result.items, 200, result.meta);
});
export const getCards = h(async (req: Request, res: Response) => {
    const { page, limit, search, status, archived } = req.query as Record<string, string>;
    const result = await S.getCards({ page: +page || 1, limit: +limit || 20, search, status, archived });
    sendSuccess(res, "Cards", result.items, 200, result.meta);
});
export const getComments = h(async (req: Request, res: Response) => {
    const { page, limit, search, status } = req.query as Record<string, string>;
    const result = await S.getComments({ page: +page || 1, limit: +limit || 20, search, status });
    sendSuccess(res, "Comments", result.items, 200, result.meta);
});
export const getUserById = h(async (req: Request, res: Response) => { sendSuccess(res, "User", await S.getUserById(+req.params.userId)); });
export const updateUser = h(async (req: Request, res: Response) => { sendSuccess(res, "Updated", await S.updateUser(+req.params.userId, req.body)); });
export const deleteUser = h(async (req: Request, res: Response) => { await S.deleteUser(+req.params.userId); sendSuccess(res, "Deleted"); });
export const lockUser = h(async (req: Request, res: Response) => { sendSuccess(res, "Locked", await S.lockUser(+req.params.userId, +req.body.minutes || 30)); });
export const unlockUser = h(async (req: Request, res: Response) => { sendSuccess(res, "Unlocked", await S.unlockUser(+req.params.userId)); });
export const getSystemStats = h(async (req: Request, res: Response) => { sendSuccess(res, "Stats", await S.getSystemStats()); });
export const getErrorLogs = h(async (req: Request, res: Response) => {
    const { page, limit, search, statusCode, source, level, userId, from, to } = req.query as Record<string, string>;
    const result = await S.getErrorLogs({
        page: +page || 1,
        limit: +limit || 20,
        search,
        statusCode: statusCode ? +statusCode : undefined,
        source: source as any,
        level: level as any,
        userId: userId ? +userId : undefined,
        from,
        to,
    });
    sendSuccess(res, "Error logs", result.items, 200, result.meta);
});
export const getErrorLogById = h(async (req: Request, res: Response) => {
    sendSuccess(res, "Error log", await S.getErrorLogById(+req.params.id));
});
export const getErrorLogStats = h(async (req: Request, res: Response) => {
    sendSuccess(res, "Error log stats", await S.getErrorLogStats());
});


// ─── Admin routes ─────────────────────────────────────────────────────────────
import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/rbac.middleware";
import { validate } from "../../middleware/validation.middleware";

export const adminRouter = Router();
adminRouter.use(authenticate, requireRole("super_admin", "admin"));

adminRouter.get("/stats", getSystemStats);
adminRouter.get("/error-logs/stats", getErrorLogStats);
adminRouter.get("/error-logs", getErrorLogs);
adminRouter.get("/error-logs/:id", getErrorLogById);
adminRouter.get("/workspaces", getWorkspaces);
adminRouter.get("/boards", getBoards);
adminRouter.get("/cards", getCards);
adminRouter.get("/comments", getComments);
adminRouter.get("/users", getUsers);
adminRouter.get("/users/:userId", getUserById);
adminRouter.patch("/users/:userId",
    validate([
        { field: "role", required: false, enum: ["super_admin", "admin", "user"] },
        { field: "isActive", required: false, type: "boolean" },
    ]),
    updateUser);
adminRouter.delete("/users/:userId", requireRole("super_admin"), deleteUser);
adminRouter.post("/users/:userId/lock",
    validate([{ field: "minutes", required: false, type: "number", min: 1, max: 10080 }]),
    lockUser);
adminRouter.post("/users/:userId/unlock", unlockUser);