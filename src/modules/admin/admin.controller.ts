// src/modules/admin/admin.controller.ts
import { Request, Response, NextFunction } from "express";
import * as S from "./admin.service";
import { sendSuccess } from "../../utils/response";

const h = (fn: Function) => async (req: Request, res: Response, next: NextFunction) => { try { await fn(req, res); } catch (e) { next(e); } };

export const getUsers = h(async (req: Request, res: Response) => {
    const { page, limit, search, role } = req.query as Record<string, string>;
    const result = await S.getUsers({ page: +page || 1, limit: +limit || 20, search, role: role as any });
    sendSuccess(res, "Users", result.users, 200, result.meta);
});
export const getUserById = h(async (req: Request, res: Response) => { sendSuccess(res, "User", await S.getUserById(+req.params.userId)); });
export const updateUser = h(async (req: Request, res: Response) => { sendSuccess(res, "Updated", await S.updateUser(+req.params.userId, req.body)); });
export const deleteUser = h(async (req: Request, res: Response) => { await S.deleteUser(+req.params.userId); sendSuccess(res, "Deleted"); });
export const lockUser = h(async (req: Request, res: Response) => { sendSuccess(res, "Locked", await S.lockUser(+req.params.userId, +req.body.minutes || 30)); });
export const unlockUser = h(async (req: Request, res: Response) => { sendSuccess(res, "Unlocked", await S.unlockUser(+req.params.userId)); });
export const getSystemStats = h(async (req: Request, res: Response) => { sendSuccess(res, "Stats", await S.getSystemStats()); });


// ─── Admin routes ─────────────────────────────────────────────────────────────
import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/rbac.middleware";
import { validate } from "../../middleware/validation.middleware";

export const adminRouter = Router();
adminRouter.use(authenticate, requireRole("super_admin", "admin"));

adminRouter.get("/stats", getSystemStats);
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