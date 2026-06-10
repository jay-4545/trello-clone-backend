// src/modules/board/board.routes.ts
import { Router } from "express";
import * as C from "./board.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { requireWorkspaceRole, requireBoardAccess } from "../../middleware/rbac.middleware";
import { validate } from "../../middleware/validation.middleware";
import { writeLimiter } from "../../middleware/rate-limit";

const r = Router({ mergeParams: true });
r.use(authenticate);

// All board routes are under /api/workspaces/:workspaceId/boards
r.post("/", requireWorkspaceRole("member", "admin", "owner"), writeLimiter(),
    validate([{ field: "name", required: true, type: "string", minLength: 1, maxLength: 200 }]),
    C.createBoard);
r.get("/", requireWorkspaceRole("viewer", "member", "admin", "owner"), C.getBoards);

r.get("/:boardId", requireBoardAccess("viewer", "member", "admin"), C.getBoardDetail);
r.patch("/:boardId", requireBoardAccess("admin"), writeLimiter(), C.updateBoard);
r.delete("/:boardId", requireBoardAccess("admin"), C.deleteBoard);
r.post("/:boardId/close", requireBoardAccess("admin"), C.closeBoard);

// Members
r.get("/:boardId/members", requireBoardAccess("viewer", "member", "admin"), C.getMembers);
r.post("/:boardId/members", requireBoardAccess("admin"), writeLimiter(),
    validate([
        { field: "email", required: true, type: "string", isEmail: true },
        { field: "role", required: false, enum: ["admin", "member", "viewer"] },
    ]),
    C.inviteMember);
r.patch("/:boardId/members/:userId", requireBoardAccess("admin"),
    validate([{ field: "role", required: true, enum: ["admin", "member", "viewer"] }]),
    C.updateMemberRole);
r.delete("/:boardId/members/:userId", requireBoardAccess("admin"), C.removeMember);

export default r;