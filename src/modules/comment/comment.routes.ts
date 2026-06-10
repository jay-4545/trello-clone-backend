// src/modules/comment/comment.routes.ts
import { Router } from "express";
import * as C from "./comment.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { requireBoardAccess } from "../../middleware/rbac.middleware";
import { validate } from "../../middleware/validation.middleware";
import { writeLimiter } from "../../middleware/rate-limit";

// Mounted at /api/workspaces/:workspaceId/boards/:boardId/cards/:cardId/comments
const r = Router({ mergeParams: true });
r.use(authenticate);

r.get("/", requireBoardAccess("viewer", "member", "admin"), C.getComments);
r.post("/", requireBoardAccess("member", "admin"), writeLimiter(),
    validate([
        { field: "content", required: true, type: "string", minLength: 1, maxLength: 10000 },
        { field: "parentId", required: false, type: "number" },
    ]),
    C.createComment);
r.patch("/:commentId", requireBoardAccess("member", "admin"), writeLimiter(),
    validate([{ field: "content", required: true, type: "string", minLength: 1, maxLength: 10000 }]),
    C.updateComment);
r.delete("/:commentId", requireBoardAccess("member", "admin"), C.deleteComment);

export default r;