// src/middleware/rbac.middleware.ts
import { Request, Response, NextFunction } from "express";
import { sendForbidden } from "../utils/response";
import { SystemRole, WorkspaceRole, BoardRole } from "../types";
import { Board, BoardMember, WorkspaceMember } from "../config/associations";
import { recordError } from "../modules/error-log/error-log.service";

function logForbidden(req: Request, message: string, context?: Record<string, unknown>) {
    recordError({
        req,
        source: "rbac",
        statusCode: 403,
        message,
        responseMessage: message,
        errorName: "ForbiddenError",
        level: "warning",
        isOperational: true,
        context: context ?? null,
    });
}

// ─── System role guard ────────────────────────────────────────────────────────
export const requireRole = (...roles: SystemRole[]) =>
    (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user || !roles.includes(req.user.role)) {
            logForbidden(req, "Insufficient system privileges", { requiredRoles: roles, userRole: req.user?.role });
            sendForbidden(res, "Insufficient system privileges");
            return;
        }
        next();
    };

// ─── Workspace role hierarchy ─────────────────────────────────────────────────
const WS_RANK: Record<WorkspaceRole, number> = { owner: 4, admin: 3, member: 2, viewer: 1 };

export const requireWorkspaceRole = (...roles: WorkspaceRole[]) =>
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const workspaceId = Number(req.params.workspaceId ?? req.params.id);
        if (!req.user || isNaN(workspaceId)) {
            logForbidden(req, "Workspace access denied", { workspaceId });
            sendForbidden(res);
            return;
        }

        // super_admin bypasses everything
        if (req.user.role === "super_admin") return next();

        const membership = await WorkspaceMember.findOne({
            where: { workspaceId, userId: req.user.id },
        });
        if (!membership) {
            logForbidden(req, "You are not a member of this workspace", { workspaceId });
            sendForbidden(res, "You are not a member of this workspace");
            return;
        }

        const required = Math.min(...roles.map((r) => WS_RANK[r]));
        if (WS_RANK[membership.role] < required) {
            logForbidden(req, "Insufficient workspace privileges", { workspaceId, role: membership.role, requiredRoles: roles });
            sendForbidden(res, "Insufficient workspace privileges");
            return;
        }
        (req as any).workspaceMembership = membership;
        next();
    };

// ─── Board role hierarchy ─────────────────────────────────────────────────────
const BOARD_RANK: Record<BoardRole, number> = { admin: 3, member: 2, viewer: 1 };

export const requireBoardAccess = (...roles: BoardRole[]) =>
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const boardId = Number(req.params.boardId ?? req.params.id);
        if (!req.user || isNaN(boardId)) {
            logForbidden(req, "Board access denied", { boardId });
            sendForbidden(res);
            return;
        }

        if (req.user.role === "super_admin") return next();

        const board = await Board.findByPk(boardId);
        if (!board) {
            logForbidden(req, "Board not found", { boardId });
            sendForbidden(res, "Board not found");
            return;
        }

        // Public boards are readable by anyone
        if (board.visibility === "public" && roles.every((r) => r === "viewer")) return next();

        const boardMember = await BoardMember.findOne({ where: { boardId, userId: req.user.id } });
        if (!boardMember) {
            // Fall back to workspace-level role
            const wsMember = await WorkspaceMember.findOne({
                where: { workspaceId: board.workspaceId, userId: req.user.id },
            });
            if (!wsMember) {
                logForbidden(req, "You do not have access to this board", { boardId, workspaceId: board.workspaceId });
                sendForbidden(res, "You do not have access to this board");
                return;
            }
            // workspace admins/owners get board admin access
            if (wsMember.role === "owner" || wsMember.role === "admin") return next();
            // workspace members get board member access
            if (wsMember.role === "member" && roles.includes("member")) return next();
            logForbidden(req, "Insufficient board privileges", { boardId, workspaceRole: wsMember.role, requiredRoles: roles });
            sendForbidden(res, "Insufficient board privileges");
            return;
        }

        const required = Math.min(...roles.map((r) => BOARD_RANK[r]));
        if (BOARD_RANK[boardMember.role] < required) {
            logForbidden(req, "Insufficient board privileges", { boardId, boardRole: boardMember.role, requiredRoles: roles });
            sendForbidden(res, "Insufficient board privileges");
            return;
        }
        (req as any).boardMembership = boardMember;
        next();
    };